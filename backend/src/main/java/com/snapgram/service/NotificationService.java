package com.snapgram.service;

import com.snapgram.dto.response.NotificationResponse;
import com.snapgram.dto.response.PageResponse;
import com.snapgram.dto.response.UserResponse;
import com.snapgram.model.Notification;
import com.snapgram.model.User;
import com.snapgram.repository.NotificationRepository;
import com.snapgram.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * BUG FIX: markAllAsRead() used PageRequest.of(0, Integer.MAX_VALUE) which crashes MongoDB.
 *           Fixed to use a List-returning repository method instead.
 * BUG FIX: notification.isRead() -> notification.isRead() (field renamed "read", getter isRead()).
 * BUG FIX: notification.setRead(true) -> notification.setRead(true) (setter setRead()).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository         userRepository;
    private final SimpMessagingTemplate  messagingTemplate;

    @Async
    public void createNotification(String recipientId, String actorId,
                                    Notification.NotificationType type,
                                    String entityId, String entityType, String message) {
        if (recipientId.equals(actorId)) return;

        Notification notification = Notification.builder()
                .recipientId(recipientId)
                .actorId(actorId)
                .type(type)
                .entityId(entityId)
                .entityType(entityType)
                .message(message)
                .read(false)     // FIX: field renamed "read"
                .build();

        Notification saved = notificationRepository.save(notification);

        userRepository.findById(actorId).ifPresent(actor -> {
            NotificationResponse response = toResponse(saved, actor);
            messagingTemplate.convertAndSendToUser(recipientId, "/queue/notifications", response);
            log.debug("Notification pushed to {}: {}", recipientId, type);
        });
    }

    public PageResponse<NotificationResponse> getNotifications(String userId, int page, int size) {
        Page<Notification> notifications = notificationRepository
                .findByRecipientIdOrderByCreatedAtDesc(userId, PageRequest.of(page, size));

        List<NotificationResponse> responses = notifications.getContent().stream()
                .map(n -> {
                    User actor = userRepository.findById(n.getActorId()).orElse(null);
                    return toResponse(n, actor);
                }).toList();

        return PageResponse.<NotificationResponse>builder()
                .content(responses).page(page).size(size)
                .totalElements(notifications.getTotalElements())
                .totalPages(notifications.getTotalPages())
                .last(notifications.isLast()).first(notifications.isFirst())
                .build();
    }

    public long getUnreadCount(String userId) {
        return notificationRepository.countByRecipientIdAndRead(userId, false);
    }

    public void markAllAsRead(String userId) {
        // FIX: was PageRequest.of(0, Integer.MAX_VALUE) — crashes MongoDB with large datasets.
        // Now uses a List-returning query method.
        List<Notification> unread = notificationRepository
                .findByRecipientIdAndRead(userId, false);
        unread.forEach(n -> n.setRead(true));   // FIX: setRead() matches field "read"
        notificationRepository.saveAll(unread);
    }

    public void markAsRead(String notificationId, String userId) {
        notificationRepository.findById(notificationId).ifPresent(n -> {
            if (n.getRecipientId().equals(userId)) {
                n.setRead(true);     // FIX: setRead()
                notificationRepository.save(n);
            }
        });
    }

    public void deleteAllNotifications(String userId) {
        notificationRepository.deleteByRecipientId(userId);
    }

    private NotificationResponse toResponse(Notification notification, User actor) {
        UserResponse actorResponse = null;
        if (actor != null) {
            actorResponse = UserResponse.builder()
                    .id(actor.getId())
                    .username(actor.getUsername())
                    .fullName(actor.getFullName())
                    .profilePictureUrl(actor.getProfilePictureUrl())
                    .build();
        }
        return NotificationResponse.builder()
                .id(notification.getId())
                .actor(actorResponse)
                .type(notification.getType().name())
                .entityId(notification.getEntityId())
                .entityType(notification.getEntityType())
                .message(notification.getMessage())
                .isRead(notification.isRead())     // FIX: field "read", getter isRead()
                .createdAt(notification.getCreatedAt())
                .build();
    }
}
