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

/**
 * BUG FIX: "isDeleted" -> "deleted"
 */
@Document(collection = "messages")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Message {

    @Id
    private String id;

    @Indexed
    private String conversationId;

    private String senderId;
    private String content;

    @Builder.Default
    private MessageType messageType = MessageType.TEXT;

    private String mediaUrl;
    private String mediaPublicId;
    private String sharedPostId;

    @Builder.Default
    private MessageStatus status = MessageStatus.SENT;

    @Builder.Default
    private List<String> readByUserIds = new ArrayList<>();

    /** FIX: was "isDeleted" */
    @Builder.Default
    private boolean deleted = false;

    private String deletedBy;
    private LocalDateTime deletedAt;

    @Builder.Default
    private boolean edited = false;
    private LocalDateTime editedAt;

    @CreatedDate
    private LocalDateTime createdAt;

    public enum MessageType {
        TEXT, IMAGE, VOICE, POST_SHARE, STORY_REPLY
    }

    public enum MessageStatus {
        SENT, DELIVERED, SEEN
    }
}
