package com.snapgram.controller;

import com.snapgram.dto.request.UpdateProfileRequest;
import com.snapgram.dto.response.*;
import com.snapgram.model.LoginHistory;
import com.snapgram.security.service.UserDetailsImpl;
import com.snapgram.service.LoginHistoryService;
import com.snapgram.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService         userService;
    private final LoginHistoryService loginHistoryService;

    // ── USERNAME AVAILABILITY CHECK (public — used during signup) ─────────
    /**
     * GET /api/users/check-username/{username}
     *
     * Returns { available: true/false } so the frontend can show real-time
     * username availability feedback during signup Step 3.
     *
     * This endpoint is PUBLIC (no authentication required) — permitted
     * in SecurityConfig for unauthenticated access.
     */
    @GetMapping("/check-username/{username}")
    public ResponseEntity<ApiResponse<Boolean>> checkUsername(@PathVariable String username) {
        boolean available = !userService.existsByUsername(username.toLowerCase().trim());
        String msg = available
                ? "Username '" + username + "' is available!"
                : "Username '" + username + "' is already taken.";
        return ResponseEntity.ok(ApiResponse.success(msg, available));
    }

    // ── OWN PROFILE ────────────────────────────────────────────────────────
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse>> getMe(
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                userService.getProfileById(userDetails.getId(), userDetails.getId())));
    }

    @PutMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse>> updateProfile(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @Valid @RequestBody UpdateProfileRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Profile updated",
                userService.updateProfile(userDetails.getId(), request)));
    }

    @PostMapping("/me/profile-picture")
    public ResponseEntity<ApiResponse<UserResponse>> uploadProfilePicture(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(ApiResponse.success("Profile picture updated",
                userService.updateProfilePicture(userDetails.getId(), file)));
    }

    @PostMapping("/me/cover-photo")
    public ResponseEntity<ApiResponse<UserResponse>> uploadCoverPhoto(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(ApiResponse.success("Cover photo updated",
                userService.updateCoverPhoto(userDetails.getId(), file)));
    }

    // ── PUBLIC PROFILE ─────────────────────────────────────────────────────
    @GetMapping("/{username}/profile")
    public ResponseEntity<ApiResponse<UserResponse>> getProfile(
            @PathVariable String username,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        String viewerId = userDetails != null ? userDetails.getId() : null;
        return ResponseEntity.ok(ApiResponse.success(
                userService.getProfileByUsername(username, viewerId)));
    }

    // ── SOCIAL ACTIONS ─────────────────────────────────────────────────────
    @PostMapping("/{userId}/follow")
    public ResponseEntity<ApiResponse<Void>> followUser(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable String userId) {
        userService.followUser(userDetails.getId(), userId);
        return ResponseEntity.ok(ApiResponse.success("Followed successfully", null));
    }

    @DeleteMapping("/{userId}/follow")
    public ResponseEntity<ApiResponse<Void>> unfollowUser(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable String userId) {
        userService.unfollowUser(userDetails.getId(), userId);
        return ResponseEntity.ok(ApiResponse.success("Unfollowed successfully", null));
    }

    @PostMapping("/{userId}/block")
    public ResponseEntity<ApiResponse<Void>> blockUser(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable String userId) {
        userService.blockUser(userDetails.getId(), userId);
        return ResponseEntity.ok(ApiResponse.success("User blocked", null));
    }

    @DeleteMapping("/{userId}/block")
    public ResponseEntity<ApiResponse<Void>> unblockUser(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable String userId) {
        userService.unblockUser(userDetails.getId(), userId);
        return ResponseEntity.ok(ApiResponse.success("User unblocked", null));
    }

    @PostMapping("/{userId}/mute")
    public ResponseEntity<ApiResponse<Void>> muteUser(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable String userId) {
        userService.muteUser(userDetails.getId(), userId);
        return ResponseEntity.ok(ApiResponse.success("User muted", null));
    }

    @DeleteMapping("/{userId}/mute")
    public ResponseEntity<ApiResponse<Void>> unmuteUser(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable String userId) {
        userService.unmuteUser(userDetails.getId(), userId);
        return ResponseEntity.ok(ApiResponse.success("User unmuted", null));
    }

    @PostMapping("/{userId}/close-friends")
    public ResponseEntity<ApiResponse<Void>> addCloseFriend(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable String userId) {
        userService.addCloseFriend(userDetails.getId(), userId);
        return ResponseEntity.ok(ApiResponse.success("Added to close friends", null));
    }

    @DeleteMapping("/{userId}/close-friends")
    public ResponseEntity<ApiResponse<Void>> removeCloseFriend(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable String userId) {
        userService.removeCloseFriend(userDetails.getId(), userId);
        return ResponseEntity.ok(ApiResponse.success("Removed from close friends", null));
    }

    // ── FOLLOWERS / FOLLOWING ──────────────────────────────────────────────
    @GetMapping("/{userId}/followers")
    public ResponseEntity<ApiResponse<PageResponse<UserResponse>>> getFollowers(
            @PathVariable String userId,
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success(
                userService.getFollowers(userId, userDetails.getId(), page, size)));
    }

    @GetMapping("/{userId}/following")
    public ResponseEntity<ApiResponse<PageResponse<UserResponse>>> getFollowing(
            @PathVariable String userId,
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success(
                userService.getFollowing(userId, userDetails.getId(), page, size)));
    }

    // ── SEARCH ─────────────────────────────────────────────────────────────
    @GetMapping("/search")
    public ResponseEntity<ApiResponse<PageResponse<UserResponse>>> searchUsers(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestParam String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success(
                userService.searchUsers(q, userDetails.getId(), page, size)));
    }

    // ── LOGIN HISTORY ──────────────────────────────────────────────────────
    @GetMapping("/me/login-history")
    public ResponseEntity<ApiResponse<Page<LoginHistory>>> getLoginHistory(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(ApiResponse.success(
                loginHistoryService.getLoginHistory(userDetails.getId(), page, size)));
    }
}
