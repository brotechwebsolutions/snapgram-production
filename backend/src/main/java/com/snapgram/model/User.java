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
 * User document.
 * ADDED: passwordResetOtp, passwordResetOtpExpiry, passwordResetOtpAttempts
 *        for OTP-based password reset (mirrors the email-verification OTP flow).
 */
@Document(collection = "users")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    private String id;

    @Indexed(unique = true)
    private String username;

    @Indexed(unique = true)
    private String email;

    private String password;
    private String fullName;
    private String bio;
    private String profilePictureUrl;
    private String coverPhotoUrl;
    private String website;
    private String gender;
    private String role; // USER, ADMIN

    // ── Email verification (OTP-based) ──────────────────────────────────────
    @Builder.Default
    private boolean emailVerified = false;

    /** 6-digit OTP sent at registration */
    private String otpCode;
    private LocalDateTime otpExpiry;

    @Builder.Default
    private int otpAttempts = 0;

    // ── Legacy token-based verification (kept for backward compat) ───────────
    private String emailVerificationToken;
    private LocalDateTime emailVerificationTokenExpiry;

    // ── Password reset — OTP-based ───────────────────────────────────────────
    /** 6-digit OTP for password reset (replaces the old UUID link flow) */
    private String passwordResetOtp;
    private LocalDateTime passwordResetOtpExpiry;

    @Builder.Default
    private int passwordResetOtpAttempts = 0;

    /** Legacy UUID token kept for any in-flight reset emails already sent */
    private String passwordResetToken;
    private LocalDateTime passwordResetTokenExpiry;

    // ── Account status ───────────────────────────────────────────────────────
    @Builder.Default
    private boolean privateAccount = false;

    @Builder.Default
    private boolean active = true;

    @Builder.Default
    private boolean accountLocked = false;

    @Builder.Default
    private int failedLoginAttempts = 0;

    private LocalDateTime lockedUntil;

    // ── Social graph ─────────────────────────────────────────────────────────
    @Builder.Default
    private List<String> followerIds = new ArrayList<>();

    @Builder.Default
    private List<String> followingIds = new ArrayList<>();

    @Builder.Default
    private List<String> blockedUserIds = new ArrayList<>();

    @Builder.Default
    private List<String> mutedUserIds = new ArrayList<>();

    @Builder.Default
    private List<String> closeFriendIds = new ArrayList<>();

    @Builder.Default
    private List<String> savedPostIds = new ArrayList<>();

    @Builder.Default
    private List<String> deviceTokens = new ArrayList<>();

    // ── Online status ────────────────────────────────────────────────────────
    @Builder.Default
    private boolean online = false;

    private LocalDateTime lastSeen;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    // ── Computed helpers ─────────────────────────────────────────────────────
    public int getFollowerCount()  { return followerIds  != null ? followerIds.size()  : 0; }
    public int getFollowingCount() { return followingIds != null ? followingIds.size() : 0; }
}
