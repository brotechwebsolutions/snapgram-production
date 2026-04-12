package com.snapgram.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "stories")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Story {

    @Id
    private String id;

    @Indexed
    private String userId;

    private String mediaUrl;
    private String mediaPublicId;
    private String mediaType; // IMAGE, VIDEO
    private String caption;
    private String backgroundColor;

    @Builder.Default
    private List<StoryView> viewers = new ArrayList<>();

    @Builder.Default
    private List<StoryReaction> reactions = new ArrayList<>();

    @Builder.Default
    private StoryPrivacy privacy = StoryPrivacy.ALL;

    @Builder.Default
    private List<String> allowedUserIds = new ArrayList<>();

    private String highlightId;

    @Indexed(expireAfterSeconds = 86400)
    private LocalDateTime expiresAt;

    @CreatedDate
    private LocalDateTime createdAt;

    public enum StoryPrivacy {
        ALL, FOLLOWERS, CLOSE_FRIENDS
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StoryView {
        private String userId;
        private LocalDateTime viewedAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StoryReaction {
        private String userId;
        private String emoji;
        private LocalDateTime createdAt;
    }
}
