package com.snapgram.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "conversations")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Conversation {

    @Id
    private String id;

    @Builder.Default
    private List<String> participantIds = new ArrayList<>();

    private String lastMessageId;
    private String lastMessageContent;
    private String lastMessageSenderId;
    private LocalDateTime lastMessageAt;

    @Builder.Default
    private List<String> pinnedByUserIds = new ArrayList<>();

    @Builder.Default
    private List<String> deletedByUserIds = new ArrayList<>();

    @Builder.Default
    private List<UnreadCount> unreadCounts = new ArrayList<>();

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UnreadCount {
        private String userId;
        private int count;
    }
}
