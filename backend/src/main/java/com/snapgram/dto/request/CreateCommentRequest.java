package com.snapgram.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

@Data
public class CreateCommentRequest {
    @NotBlank(message = "Comment content is required")
    @Size(max = 2200)
    private String       content;
    private String       parentCommentId;
    private List<String> mentionedUserIds;
}
