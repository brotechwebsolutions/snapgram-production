package com.snapgram.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * BUG FIX: "isPinned" renamed to "pinned" and "commentsDisabled" kept as-is.
 * Lombok @Builder conflicts with boolean fields named isXxx.
 */
@Document(collection = "posts")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Post {

    @Id
    private String id;

    @Indexed
    private String userId;

    @Builder.Default
    private List<String> mediaUrls = new ArrayList<>();

    @Builder.Default
    private List<String> mediaPublicIds = new ArrayList<>();

    private String caption;
    private String location;

    @Builder.Default
    private List<String> hashtags = new ArrayList<>();

    @Builder.Default
    private List<String> mentionedUserIds = new ArrayList<>();

    @Builder.Default
    private List<String> likedByUserIds = new ArrayList<>();

    @Builder.Default
    private List<Reaction> reactions = new ArrayList<>();

    @Builder.Default
    private int commentCount = 0;

    @Builder.Default
    private int viewCount = 0;

    @Builder.Default
    private PostStatus status = PostStatus.PUBLISHED;

    @Builder.Default
    private boolean commentsDisabled = false;

    /** FIX: was "isPinned" - renamed to "pinned" to avoid Lombok @Builder conflict */
    @Builder.Default
    private boolean pinned = false;

    private String pinnedCommentId;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    public enum PostStatus {
        DRAFT, PUBLISHED, ARCHIVED, DELETED
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Reaction {
        private String userId;
        private String emoji;
        private LocalDateTime createdAt;
    }

    public int getLikeCount() {
        return likedByUserIds != null ? likedByUserIds.size() : 0;
    }
}
