package com.snapgram.service;

import com.snapgram.dto.request.CreateStoryRequest;
import com.snapgram.dto.response.StoryResponse;
import com.snapgram.dto.response.UserResponse;
import com.snapgram.exception.*;
import com.snapgram.model.*;
import com.snapgram.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.*;

/**
 * BUG FIX: All User field renames applied (isPrivateAccount, isOnline -> isOnline() etc.)
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class StoryService {

    private final StoryRepository         storyRepository;
    private final StoryHighlightRepository highlightRepository;
    private final UserRepository           userRepository;
    private final CloudinaryService        cloudinaryService;
    private final UserService              userService;
    private final NotificationService      notificationService;

    public StoryResponse createStory(String userId, CreateStoryRequest request, MultipartFile file) {
        Map<String, String> upload = cloudinaryService.uploadStoryMedia(file, "stories");

        Story.StoryPrivacy privacy = Story.StoryPrivacy.ALL;
        if (request.getPrivacy() != null) {
            try { privacy = Story.StoryPrivacy.valueOf(request.getPrivacy()); }
            catch (IllegalArgumentException ignored) {}
        }

        Story story = Story.builder()
                .userId(userId)
                .mediaUrl(upload.get("url"))
                .mediaPublicId(upload.get("publicId"))
                .mediaType(upload.getOrDefault("mediaType", "IMAGE"))
                .caption(request.getCaption())
                .backgroundColor(request.getBackgroundColor())
                .privacy(privacy)
                .expiresAt(LocalDateTime.now().plusHours(24))
                .build();

        Story saved = storyRepository.save(story);
        log.info("Story created: {} by user: {}", saved.getId(), userId);
        return toStoryResponse(saved, userId);
    }

    public List<Map<String, Object>> getFeedStories(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        List<String> ids = new ArrayList<>(user.getFollowingIds());
        ids.add(0, userId);

        List<Story> activeStories = storyRepository.findActiveStoriesByUserIds(ids, LocalDateTime.now());

        Map<String, List<Story>> byUser = new LinkedHashMap<>();
        activeStories.stream()
                .filter(s -> canView(s, userId, user))
                .forEach(s -> byUser.computeIfAbsent(s.getUserId(), k -> new ArrayList<>()).add(s));

        List<Map<String, Object>> result = new ArrayList<>();
        if (byUser.containsKey(userId)) {
            result.add(buildGroup(userId, byUser.get(userId), userId));
        }
        byUser.entrySet().stream()
                .filter(e -> !e.getKey().equals(userId))
                .sorted((a, b) -> {
                    LocalDateTime la = a.getValue().stream().map(Story::getCreatedAt)
                            .max(Comparator.naturalOrder()).orElse(LocalDateTime.MIN);
                    LocalDateTime lb = b.getValue().stream().map(Story::getCreatedAt)
                            .max(Comparator.naturalOrder()).orElse(LocalDateTime.MIN);
                    return lb.compareTo(la);
                })
                .forEach(e -> result.add(buildGroup(e.getKey(), e.getValue(), userId)));
        return result;
    }

    public StoryResponse viewStory(String storyId, String viewerId) {
        Story story = getActiveStory(storyId);
        boolean alreadyViewed = story.getViewers().stream()
                .anyMatch(v -> v.getUserId().equals(viewerId));
        if (!alreadyViewed && !story.getUserId().equals(viewerId)) {
            story.getViewers().add(Story.StoryView.builder()
                    .userId(viewerId).viewedAt(LocalDateTime.now()).build());
            storyRepository.save(story);
        }
        return toStoryResponse(story, viewerId);
    }

    public void reactToStory(String storyId, String userId, String emoji) {
        Story story = getActiveStory(storyId);
        story.getReactions().removeIf(r -> r.getUserId().equals(userId));
        if (emoji != null && !emoji.isBlank()) {
            story.getReactions().add(Story.StoryReaction.builder()
                    .userId(userId).emoji(emoji).createdAt(LocalDateTime.now()).build());
            if (!story.getUserId().equals(userId)) {
                userRepository.findById(userId).ifPresent(reactor ->
                    notificationService.createNotification(
                        story.getUserId(), userId, Notification.NotificationType.STORY_REACTION,
                        storyId, "STORY", reactor.getUsername() + " reacted to your story: " + emoji)
                );
            }
        }
        storyRepository.save(story);
    }

    public void deleteStory(String storyId, String userId) {
        Story story = storyRepository.findById(storyId)
                .orElseThrow(() -> new ResourceNotFoundException("Story", storyId));
        if (!story.getUserId().equals(userId)) {
            throw new ForbiddenException("You can only delete your own stories");
        }
        cloudinaryService.deleteResource(story.getMediaPublicId());
        storyRepository.delete(story);
    }

    public StoryHighlight createHighlight(String userId, String title, String coverUrl, List<String> storyIds) {
        StoryHighlight h = StoryHighlight.builder()
                .userId(userId).title(title).coverImageUrl(coverUrl)
                .storyIds(storyIds != null ? storyIds : new ArrayList<>())
                .build();
        return highlightRepository.save(h);
    }

    public List<StoryHighlight> getUserHighlights(String userId) {
        return highlightRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public void deleteHighlight(String highlightId, String userId) {
        StoryHighlight h = highlightRepository.findById(highlightId)
                .orElseThrow(() -> new ResourceNotFoundException("Highlight", highlightId));
        if (!h.getUserId().equals(userId)) throw new ForbiddenException("Access denied");
        highlightRepository.delete(h);
    }

    // ── HELPERS ───────────────────────────────────────────────────────────────

    private Story getActiveStory(String storyId) {
        Story story = storyRepository.findById(storyId)
                .orElseThrow(() -> new ResourceNotFoundException("Story", storyId));
        if (story.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new ResourceNotFoundException("Story has expired");
        }
        return story;
    }

    private boolean canView(Story story, String viewerId, User viewer) {
        if (story.getUserId().equals(viewerId)) return true;
        return switch (story.getPrivacy()) {
            case ALL -> true;
            case FOLLOWERS -> {
                User owner = userRepository.findById(story.getUserId()).orElse(null);
                yield owner != null && owner.getFollowerIds().contains(viewerId);
            }
            case CLOSE_FRIENDS -> {
                User owner = userRepository.findById(story.getUserId()).orElse(null);
                yield owner != null && owner.getCloseFriendIds().contains(viewerId);
            }
        };
    }

    private Map<String, Object> buildGroup(String userId, List<Story> stories, String viewerId) {
        User user = userRepository.findById(userId).orElse(null);
        boolean hasUnviewed = stories.stream().anyMatch(s ->
                s.getViewers().stream().noneMatch(v -> v.getUserId().equals(viewerId))
                && !s.getUserId().equals(viewerId));
        Map<String, Object> group = new LinkedHashMap<>();
        group.put("user",       user != null ? userService.toUserResponse(user, viewerId) : null);
        group.put("stories",    stories.stream().map(s -> toStoryResponse(s, viewerId)).toList());
        group.put("hasUnviewed", hasUnviewed);
        return group;
    }

    private StoryResponse toStoryResponse(Story story, String viewerId) {
        User user       = userRepository.findById(story.getUserId()).orElse(null);
        boolean viewed  = story.getViewers().stream().anyMatch(v -> v.getUserId().equals(viewerId));
        String reaction = story.getReactions().stream()
                .filter(r -> r.getUserId().equals(viewerId))
                .map(Story.StoryReaction::getEmoji).findFirst().orElse(null);

        List<UserResponse> viewers = null;
        if (story.getUserId().equals(viewerId)) {
            viewers = story.getViewers().stream()
                    .map(v -> userRepository.findById(v.getUserId())
                            .map(u -> userService.toUserResponse(u, viewerId)).orElse(null))
                    .filter(Objects::nonNull).toList();
        }

        return StoryResponse.builder()
                .id(story.getId())
                .user(user != null ? userService.toUserResponse(user, viewerId) : null)
                .mediaUrl(story.getMediaUrl())
                .mediaType(story.getMediaType())
                .caption(story.getCaption())
                .backgroundColor(story.getBackgroundColor())
                .viewCount(story.getViewers().size())
                .viewers(viewers)
                .privacy(story.getPrivacy().name())
                .expiresAt(story.getExpiresAt())
                .createdAt(story.getCreatedAt())
                .hasViewed(viewed)
                .viewerReaction(reaction)
                .build();
    }
}
