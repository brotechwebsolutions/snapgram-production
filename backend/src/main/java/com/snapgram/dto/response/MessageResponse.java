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
public class MessageResponse {
    private String        id;
    private String        conversationId;
    private UserResponse  sender;
    private String        content;
    private String        messageType;
    private String        mediaUrl;
    private PostResponse  sharedPost;
    private String        status;
    private boolean       isDeleted;
    private LocalDateTime createdAt;
}
