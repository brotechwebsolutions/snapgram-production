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
public class PostResponse {
    private String            id;
    private UserResponse      user;
    private List<String>      mediaUrls;
    private String            caption;
    private String            location;
    private List<String>      hashtags;
    private List<UserResponse> mentionedUsers;
    private int               likeCount;
    private int               commentCount;
    private int               viewCount;
    private String            status;
    private boolean           commentsDisabled;
    private boolean           isPinned;
    private String            pinnedCommentId;
    private LocalDateTime     createdAt;
    private LocalDateTime     updatedAt;
    // Viewer context
    private Boolean           isLiked;
    private Boolean           isSaved;
    private String            viewerReaction;
}
