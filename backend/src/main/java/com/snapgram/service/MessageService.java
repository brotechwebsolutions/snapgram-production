package com.snapgram.service;

import com.snapgram.dto.request.SendMessageRequest;
import com.snapgram.dto.response.ConversationResponse;
import com.snapgram.dto.response.MessageResponse;
import com.snapgram.dto.response.PageResponse;
import com.snapgram.dto.response.PostResponse;
import com.snapgram.dto.response.UserResponse;
import com.snapgram.exception.*;
import com.snapgram.model.*;
import com.snapgram.repository.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.*;

/**
 * BUG FIX: Circular dependency — MessageService -> PostService -> UserService -> NotificationService.
 *   Solution: Inject PostService with @Lazy to break the circular dependency at startup.
 * BUG FIX: message.isDeleted() -> message.isDeleted() (field renamed "deleted", getter isDeleted()).
 * BUG FIX: message.setDeleted(true) -> field rename handled.
 */
@Service
@Slf4j
public class MessageService {

    private final MessageRepository      messageRepository;
    private final ConversationRepository conversationRepository;
    private final UserRepository         userRepository;
    private final PostRepository         postRepository;
    private final CloudinaryService      cloudinaryService;
    private final UserService            userService;
    private final SimpMessagingTemplate  messagingTemplate;

    // FIX: @Lazy breaks the circular dependency chain
    // MessageService -> @Lazy PostService -> (resolved after context startup)
    @Lazy
    private final PostService postService;

    @Autowired
    public MessageService(
            MessageRepository      messageRepository,
            ConversationRepository conversationRepository,
            UserRepository         userRepository,
            PostRepository         postRepository,
            CloudinaryService      cloudinaryService,
            UserService            userService,
            SimpMessagingTemplate  messagingTemplate,
            @Lazy PostService      postService) {
        this.messageRepository      = messageRepository;
        this.conversationRepository = conversationRepository;
        this.userRepository         = userRepository;
        this.postRepository         = postRepository;
        this.cloudinaryService      = cloudinaryService;
        this.userService            = userService;
        this.messagingTemplate      = messagingTemplate;
        this.postService            = postService;
    }

    // ── SEND MESSAGE ─────────────────────────────────────────────────────────

    public MessageResponse sendMessage(String senderId, SendMessageRequest request, MultipartFile mediaFile) {
        userRepository.findById(senderId)
                .orElseThrow(() -> new ResourceNotFoundException("User", senderId));
        User recipient = userRepository.findById(request.getRecipientId())
                .orElseThrow(() -> new ResourceNotFoundException("User", request.getRecipientId()));

        if (recipient.getBlockedUserIds().contains(senderId)) {
            throw new ForbiddenException("You cannot send messages to this user");
        }

        Conversation conversation = conversationRepository
                .findDirectConversation(senderId, request.getRecipientId())
                .orElseGet(() -> {
                    List<Conversation.UnreadCount> counts = new ArrayList<>();
                    counts.add(Conversation.UnreadCount.builder().userId(senderId).count(0).build());
                    counts.add(Conversation.UnreadCount.builder().userId(request.getRecipientId()).count(0).build());
                    return conversationRepository.save(Conversation.builder()
                            .participantIds(new ArrayList<>(List.of(senderId, request.getRecipientId())))
                            .unreadCounts(counts)
                            .build());
                });

        String mediaUrl      = null;
        Message.MessageType messageType = Message.MessageType.TEXT;

        if (mediaFile != null && !mediaFile.isEmpty()) {
            Map<String, String> upload = cloudinaryService.uploadImage(mediaFile, "messages");
            mediaUrl      = upload.get("url");
            messageType   = Message.MessageType.IMAGE;
        } else if (request.getMessageType() != null) {
            try { messageType = Message.MessageType.valueOf(request.getMessageType()); }
            catch (IllegalArgumentException ignored) { messageType = Message.MessageType.TEXT; }
        }

        Message message = Message.builder()
                .conversationId(conversation.getId())
                .senderId(senderId)
                .content(request.getContent())
                .messageType(messageType)
                .mediaUrl(mediaUrl)
                .sharedPostId(request.getSharedPostId())
                .status(Message.MessageStatus.SENT)
                .build();

        Message saved = messageRepository.save(message);

        // Update conversation metadata
        conversation.setLastMessageId(saved.getId());
        conversation.setLastMessageContent(buildPreview(saved));
        conversation.setLastMessageSenderId(senderId);
        conversation.setLastMessageAt(LocalDateTime.now());
        conversation.getDeletedByUserIds().remove(senderId);
        conversation.getDeletedByUserIds().remove(request.getRecipientId());

        // Increment unread count for recipient
        conversation.getUnreadCounts().stream()
                .filter(uc -> uc.getUserId().equals(request.getRecipientId()))
                .findFirst()
                .ifPresent(uc -> uc.setCount(uc.getCount() + 1));

        conversationRepository.save(conversation);

        MessageResponse response = toMessageResponse(saved, senderId);

        // Push via WebSocket
        messagingTemplate.convertAndSendToUser(request.getRecipientId(), "/queue/messages", response);
        messagingTemplate.convertAndSendToUser(request.getRecipientId(), "/queue/conversations",
                toConversationResponse(conversation, request.getRecipientId()));

        return response;
    }

    // ── CONVERSATIONS ─────────────────────────────────────────────────────────

    public List<ConversationResponse> getConversations(String userId) {
        return conversationRepository.findByParticipantIdOrderByLastMessageAtDesc(userId)
                .stream()
                .map(c -> toConversationResponse(c, userId))
                .toList();
    }

    // ── MESSAGES ──────────────────────────────────────────────────────────────

    public PageResponse<MessageResponse> getMessages(String conversationId, String userId, int page, int size) {
        Conversation conv = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation", conversationId));
        if (!conv.getParticipantIds().contains(userId)) {
            throw new ForbiddenException("You are not a participant of this conversation");
        }
        markConversationRead(conv, userId);

        Page<Message> messages = messageRepository.findByConversationId(
                conversationId, PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));

        return PageResponse.<MessageResponse>builder()
                .content(messages.getContent().stream().map(m -> toMessageResponse(m, userId)).toList())
                .page(page).size(size)
                .totalElements(messages.getTotalElements())
                .totalPages(messages.getTotalPages())
                .last(messages.isLast()).first(messages.isFirst())
                .build();
    }

    // ── TYPING ────────────────────────────────────────────────────────────────

    public void sendTypingIndicator(String conversationId, String userId, boolean isTyping) {
        Conversation conv = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation", conversationId));

        Map<String, Object> event = Map.of(
                "conversationId", conversationId, "userId", userId, "isTyping", isTyping);

        conv.getParticipantIds().stream()
                .filter(pid -> !pid.equals(userId))
                .forEach(pid -> messagingTemplate.convertAndSendToUser(pid, "/queue/typing", event));
    }

    // ── SEEN ──────────────────────────────────────────────────────────────────

    public void markMessageSeen(String messageId, String userId) {
        messageRepository.findById(messageId).ifPresent(msg -> {
            if (!msg.getReadByUserIds().contains(userId)) {
                msg.getReadByUserIds().add(userId);
                msg.setStatus(Message.MessageStatus.SEEN);
                messageRepository.save(msg);
                messagingTemplate.convertAndSendToUser(msg.getSenderId(), "/queue/message-status",
                        Map.of("messageId", messageId, "status", "SEEN", "userId", userId));
            }
        });
    }

    // ── DELETE ────────────────────────────────────────────────────────────────

    public void deleteMessage(String messageId, String userId) {
        Message msg = messageRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("Message", messageId));
        if (!msg.getSenderId().equals(userId)) {
            throw new ForbiddenException("You can only delete your own messages");
        }
        msg.setDeleted(true);        // FIX: field "deleted", setter setDeleted()
        msg.setDeletedBy(userId);
        msg.setDeletedAt(LocalDateTime.now());
        messageRepository.save(msg);
    }

    // ── PIN CONVERSATION ──────────────────────────────────────────────────────

    public void pinConversation(String conversationId, String userId) {
        Conversation conv = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation", conversationId));
        if (!conv.getParticipantIds().contains(userId)) {
            throw new ForbiddenException("You are not a participant");
        }
        if (conv.getPinnedByUserIds().contains(userId)) {
            conv.getPinnedByUserIds().remove(userId);
        } else {
            conv.getPinnedByUserIds().add(userId);
        }
        conversationRepository.save(conv);
    }

    // ── HELPERS ───────────────────────────────────────────────────────────────

    private void markConversationRead(Conversation conv, String userId) {
        conv.getUnreadCounts().stream()
                .filter(uc -> uc.getUserId().equals(userId))
                .findFirst()
                .ifPresent(uc -> uc.setCount(0));
        conversationRepository.save(conv);
    }

    private String buildPreview(Message msg) {
        return switch (msg.getMessageType()) {
            case IMAGE       -> "📷 Photo";
            case VOICE       -> "🎤 Voice message";
            case POST_SHARE  -> "📤 Shared a post";
            case STORY_REPLY -> "↩️ Replied to story";
            default          -> msg.getContent() != null
                    ? (msg.getContent().length() > 50
                        ? msg.getContent().substring(0, 50) + "…"
                        : msg.getContent())
                    : "";
        };
    }

    private MessageResponse toMessageResponse(Message msg, String viewerId) {
        User sender = userRepository.findById(msg.getSenderId()).orElse(null);

        PostResponse sharedPost = null;
        if (msg.getSharedPostId() != null) {
            sharedPost = postRepository.findById(msg.getSharedPostId())
                    .map(p -> postService.toPostResponse(p, viewerId))
                    .orElse(null);
        }

        return MessageResponse.builder()
                .id(msg.getId())
                .conversationId(msg.getConversationId())
                .sender(sender != null ? userService.toUserResponse(sender, viewerId) : null)
                .content(msg.isDeleted() ? null : msg.getContent())    // FIX: isDeleted()
                .messageType(msg.getMessageType().name())
                .mediaUrl(msg.isDeleted() ? null : msg.getMediaUrl())  // FIX: isDeleted()
                .sharedPost(sharedPost)
                .status(msg.getStatus().name())
                .isDeleted(msg.isDeleted())                             // FIX: isDeleted()
                .createdAt(msg.getCreatedAt())
                .build();
    }

    public ConversationResponse toConversationResponse(Conversation conv, String userId) {
        List<UserResponse> participants = conv.getParticipantIds().stream()
                .map(id -> userRepository.findById(id)
                        .map(u -> userService.toUserResponse(u, userId)).orElse(null))
                .filter(Objects::nonNull)
                .toList();

        MessageResponse lastMsg = null;
        if (conv.getLastMessageId() != null) {
            lastMsg = messageRepository.findById(conv.getLastMessageId())
                    .map(m -> toMessageResponse(m, userId))
                    .orElse(null);
        }

        int unread = conv.getUnreadCounts().stream()
                .filter(uc -> uc.getUserId().equals(userId))
                .mapToInt(Conversation.UnreadCount::getCount)
                .findFirst().orElse(0);

        return ConversationResponse.builder()
                .id(conv.getId())
                .participants(participants)
                .lastMessage(lastMsg)
                .unreadCount(unread)
                .isPinned(conv.getPinnedByUserIds().contains(userId))
                .createdAt(conv.getCreatedAt())
                .updatedAt(conv.getUpdatedAt())
                .build();
    }
}
