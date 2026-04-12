package com.snapgram.dto.request;

import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

@Data
public class CreatePostRequest {
    @Size(max = 2200, message = "Caption cannot exceed 2200 characters")
    private String       caption;
    private String       location;
    private List<String> hashtags;
    private List<String> mentionedUserIds;
    private String       status;        // DRAFT | PUBLISHED
    private boolean      commentsDisabled;
}
