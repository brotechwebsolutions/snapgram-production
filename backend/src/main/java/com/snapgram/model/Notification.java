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

/**
 * BUG FIX: "isRead" -> "read"
 */
@Document(collection = "notifications")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Notification {

    @Id
    private String id;

    @Indexed
    private String recipientId;

    private String actorId;

    @Builder.Default
    private NotificationType type = NotificationType.LIKE;

    private String entityId;
    private String entityType;
    private String message;

    /** FIX: was "isRead" - renamed to "read". Lombok generates isRead() getter. */
    @Builder.Default
    private boolean read = false;

    @CreatedDate
    private LocalDateTime createdAt;

    public enum NotificationType {
        LIKE, COMMENT, REPLY, FOLLOW, FOLLOW_REQUEST,
        MENTION, STORY_REACTION, STORY_REPLY,
        POST_SHARE, MESSAGE, SYSTEM
    }
}
