package com.snapgram.service;

import com.snapgram.dto.request.UpdateProfileRequest;
import com.snapgram.dto.response.PageResponse;
import com.snapgram.dto.response.UserResponse;
import com.snapgram.exception.*;
import com.snapgram.model.Notification;
import com.snapgram.model.User;
import com.snapgram.repository.PostRepository;
import com.snapgram.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * BUG FIX: Removed unused LoginHistoryRepository injection.
 * BUG FIX: All isXxx field references updated to match renamed model fields.
 * BUG FIX: user.isOnline() -> field is now "online", Lombok generates isOnline() correctly.
 * BUG FIX: user.setPrivate() -> user.setPrivateAccount() to match renamed field.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final UserRepository        userRepository;
    private final PostRepository        postRepository;
    // FIX: LoginHistoryRepository removed — was injected but never used
    private final CloudinaryService     cloudinaryService;
    private final NotificationService   notificationService;
    private final SimpMessagingTemplate messagingTemplate;

    // ── PROFILE ──────────────────────────────────────────────────────────────

    public UserResponse getProfileByUsername(String username, String viewerId) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: @" + username));
        return toUserResponse(user, viewerId);
    }

    public UserResponse getProfileById(String userId, String viewerId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));
        return toUserResponse(user, viewerId);
    }

    public UserResponse updateProfile(String userId, UpdateProfileRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        if (request.getUsername() != null &&
                !request.getUsername().equalsIgnoreCase(user.getUsername())) {
            if (userRepository.existsByUsername(request.getUsername().toLowerCase())) {
                throw new ConflictException("Username '@" + request.getUsername() + "' is already taken");
            }
            user.setUsername(request.getUsername().toLowerCase());
        }
        if (request.getFullName()  != null) user.setFullName(request.getFullName());
        if (request.getBio()       != null) user.setBio(request.getBio());
        if (request.getWebsite()   != null) user.setWebsite(request.getWebsite());
        if (request.getGender()    != null) user.setGender(request.getGender());
        // FIX: setPrivate() -> setPrivateAccount()
        if (request.getIsPrivate() != null) user.setPrivateAccount(request.getIsPrivate());

        return toUserResponse(userRepository.save(user), userId);
    }

    public UserResponse updateProfilePicture(String userId, MultipartFile file) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));
        Map<String, String> result = cloudinaryService.uploadProfilePicture(file, userId);
        user.setProfilePictureUrl(result.get("url"));
        return toUserResponse(userRepository.save(user), userId);
    }

    public UserResponse updateCoverPhoto(String userId, MultipartFile file) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));
        Map<String, String> result = cloudinaryService.uploadCoverPhoto(file, userId);
        user.setCoverPhotoUrl(result.get("url"));
        return toUserResponse(userRepository.save(user), userId);
    }

    // ── FOLLOW / UNFOLLOW ────────────────────────────────────────────────────

    public void followUser(String followerId, String targetUserId) {
        if (followerId.equals(targetUserId)) {
            throw new BadRequestException("You cannot follow yourself");
        }
        User follower = findUser(followerId);
        User target   = findUser(targetUserId);

        if (target.getBlockedUserIds().contains(followerId)) {
            throw new ForbiddenException("Unable to follow this user");
        }
        if (follower.getFollowingIds().contains(targetUserId)) {
            throw new BadRequestException("You are already following this user");
        }

        follower.getFollowingIds().add(targetUserId);
        target.getFollowerIds().add(followerId);
        userRepository.save(follower);
        userRepository.save(target);

        broadcastUserUpdate(target);

        notificationService.createNotification(
                targetUserId, followerId,
                Notification.NotificationType.FOLLOW,
                followerId, "USER",
                follower.getUsername() + " started following you"
        );
    }

    public void unfollowUser(String followerId, String targetUserId) {
        User follower = findUser(followerId);
        User target   = findUser(targetUserId);
        follower.getFollowingIds().remove(targetUserId);
        target.getFollowerIds().remove(followerId);
        userRepository.save(follower);
        userRepository.save(target);
    }

    // ── BLOCK / UNBLOCK ──────────────────────────────────────────────────────

    public void blockUser(String blockerId, String targetUserId) {
        if (blockerId.equals(targetUserId)) throw new BadRequestException("You cannot block yourself");
        User blocker = findUser(blockerId);
        User target  = findUser(targetUserId);

        if (!blocker.getBlockedUserIds().contains(targetUserId)) {
            blocker.getBlockedUserIds().add(targetUserId);
        }
        blocker.getFollowingIds().remove(targetUserId);
        blocker.getFollowerIds().remove(targetUserId);
        target.getFollowingIds().remove(blockerId);
        target.getFollowerIds().remove(blockerId);

        userRepository.save(blocker);
        userRepository.save(target);
    }

    public void unblockUser(String blockerId, String targetUserId) {
        User blocker = findUser(blockerId);
        blocker.getBlockedUserIds().remove(targetUserId);
        userRepository.save(blocker);
    }

    // ── MUTE / UNMUTE ────────────────────────────────────────────────────────

    public void muteUser(String muterId, String targetUserId) {
        User user = findUser(muterId);
        if (!user.getMutedUserIds().contains(targetUserId)) {
            user.getMutedUserIds().add(targetUserId);
            userRepository.save(user);
        }
    }

    public void unmuteUser(String muterId, String targetUserId) {
        User user = findUser(muterId);
        user.getMutedUserIds().remove(targetUserId);
        userRepository.save(user);
    }

    // ── CLOSE FRIENDS ────────────────────────────────────────────────────────

    public void addToCloseFriends(String userId, String friendId) {
        User user = findUser(userId);
        if (!user.getCloseFriendIds().contains(friendId)) {
            user.getCloseFriendIds().add(friendId);
            userRepository.save(user);
        }
    }

    public void removeFromCloseFriends(String userId, String friendId) {
        User user = findUser(userId);
        user.getCloseFriendIds().remove(friendId);
        userRepository.save(user);
    }

    // ── SEARCH ───────────────────────────────────────────────────────────────

    public PageResponse<UserResponse> searchUsers(String query, String viewerId, int page, int size) {
        Page<User> users = userRepository.searchUsers(query, PageRequest.of(page, size));
        List<UserResponse> responses = users.getContent().stream()
                .filter(u -> !u.getId().equals(viewerId))
                .map(u -> toUserResponse(u, viewerId))
                .toList();
        return buildPage(responses, users, page, size);
    }

    // ── FOLLOWERS / FOLLOWING ─────────────────────────────────────────────

    public PageResponse<UserResponse> getFollowers(String userId, String viewerId, int page, int size) {
        Page<User> followers = userRepository.findFollowers(userId, PageRequest.of(page, size));
        List<UserResponse> responses = followers.getContent().stream()
                .map(u -> toUserResponse(u, viewerId)).toList();
        return buildPage(responses, followers, page, size);
    }

    public PageResponse<UserResponse> getFollowing(String userId, String viewerId, int page, int size) {
        Page<User> following = userRepository.findFollowing(userId, PageRequest.of(page, size));
        List<UserResponse> responses = following.getContent().stream()
                .map(u -> toUserResponse(u, viewerId)).toList();
        return buildPage(responses, following, page, size);
    }

    // ── ONLINE STATUS ────────────────────────────────────────────────────────

    public void updateOnlineStatus(String userId, boolean isOnline) {
        userRepository.findById(userId).ifPresent(user -> {
            user.setOnline(isOnline);    // FIX: field renamed to "online"
            if (!isOnline) user.setLastSeen(LocalDateTime.now());
            userRepository.save(user);
            broadcastUserUpdate(user);
        });
    }

    // ── HELPERS ──────────────────────────────────────────────────────────────

    private void broadcastUserUpdate(User user) {
        UserResponse response = toUserResponse(user, null);
        user.getFollowerIds().forEach(fid ->
                messagingTemplate.convertAndSendToUser(fid, "/queue/user-updates", response));
    }

    private User findUser(String userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));
    }

    public UserResponse toUserResponse(User user, String viewerId) {
        long postCount = postRepository.countByUserIdAndStatus(
                user.getId(), com.snapgram.model.Post.PostStatus.PUBLISHED);

        UserResponse.UserResponseBuilder b = UserResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .fullName(user.getFullName())
                .bio(user.getBio())
                .profilePictureUrl(user.getProfilePictureUrl())
                .coverPhotoUrl(user.getCoverPhotoUrl())
                .website(user.getWebsite())
                .gender(user.getGender())
                .emailVerified(user.isEmailVerified())
                .isPrivate(user.isPrivateAccount())    // FIX: renamed field
                .isOnline(user.isOnline())             // FIX: field "online" getter isOnline()
                .lastSeen(user.getLastSeen())
                .followerCount(user.getFollowerCount())
                .followingCount(user.getFollowingCount())
                .postCount(postCount)
                .createdAt(user.getCreatedAt());

        if (viewerId != null && !viewerId.equals(user.getId())) {
            b.isFollowing(user.getFollowerIds().contains(viewerId));
            b.isFollowedBy(user.getFollowingIds().contains(viewerId));
            b.isBlocked(user.getBlockedUserIds().contains(viewerId));
            b.isMuted(user.getMutedUserIds().contains(viewerId));
        }
        return b.build();
    }

    private <T> PageResponse<T> buildPage(List<T> content, Page<?> page, int pageNum, int size) {
        return PageResponse.<T>builder()
                .content(content).page(pageNum).size(size)
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .last(page.isLast()).first(page.isFirst())
                .build();
    }
    // ── ALIASES & MISSING PUBLIC METHODS ────────────────────────────────────

    /** Check if a username is already taken (used by /check-username endpoint) */
    public boolean existsByUsername(String username) {
        return userRepository.existsByUsername(username.toLowerCase().trim());
    }

    /** Alias for addToCloseFriends — used by UserController */
    public void addCloseFriend(String userId, String friendId) {
        addToCloseFriends(userId, friendId);
    }

    /** Alias for removeFromCloseFriends — used by UserController */
    public void removeCloseFriend(String userId, String friendId) {
        removeFromCloseFriends(userId, friendId);
    }


}
