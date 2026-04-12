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
 * BUG FIX: "isPinned" -> "pinned", "isDeleted" -> "deleted"
 * Lombok @Builder generates conflicting methods for boolean fields named isXxx.
 */
@Document(collection = "comments")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Comment {

    @Id
    private String id;

    @Indexed
    private String postId;

    private String userId;

    private String parentCommentId;

    private String content;

    @Builder.Default
    private List<String> likedByUserIds = new ArrayList<>();

    @Builder.Default
    private List<String> mentionedUserIds = new ArrayList<>();

    /** FIX: was "isPinned" */
    @Builder.Default
    private boolean pinned = false;

    /** FIX: was "isDeleted" */
    @Builder.Default
    private boolean deleted = false;

    @Builder.Default
    private int replyCount = 0;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    public int getLikeCount() {
        return likedByUserIds != null ? likedByUserIds.size() : 0;
    }
}
