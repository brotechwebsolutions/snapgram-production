package com.snapgram.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class StoryResponse {
    private String             id;
    private UserResponse       user;
    private String             mediaUrl;
    private String             mediaType;
    private String             caption;
    private String             backgroundColor;
    private int                viewCount;
    private List<UserResponse> viewers;
    private String             privacy;
    private LocalDateTime      expiresAt;
    private LocalDateTime      createdAt;
    private Boolean            hasViewed;
    private String             viewerReaction;
}
