package com.snapgram.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class CommentResponse {
    private String        id;
    private String        postId;
    private UserResponse  user;
    private String        parentCommentId;
    private String        content;
    private int           likeCount;
    private int           replyCount;
    private boolean       isPinned;
    private boolean       isDeleted;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Boolean       isLiked;
}
