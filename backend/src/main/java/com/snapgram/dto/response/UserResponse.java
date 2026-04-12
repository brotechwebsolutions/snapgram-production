package com.snapgram.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * BUG FIX: Boolean fields in DTOs use Boolean (boxed) not boolean (primitive)
 * so they can be null when not populated (viewer-context fields).
 * isPrivate, isOnline etc. are fine as field names in DTOs because
 * DTOs do NOT use @Builder — they use @Data which generates correct setters.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class UserResponse {
    private String  id;
    private String  username;
    private String  fullName;
    private String  email;
    private String  bio;
    private String  profilePictureUrl;
    private String  coverPhotoUrl;
    private String  website;
    private String  gender;
    private boolean emailVerified;
    private boolean isPrivate;      // DTO field name is fine — no @Builder conflict
    private boolean isOnline;
    private int     followerCount;
    private int     followingCount;
    private long    postCount;
    private LocalDateTime lastSeen;
    private LocalDateTime createdAt;

    // Viewer-context fields (nullable — only populated when viewerId != null)
    private Boolean isFollowing;
    private Boolean isFollowedBy;
    private Boolean isBlocked;
    private Boolean isMuted;
}
