package com.snapgram.service;

import com.snapgram.dto.request.CreatePostRequest;
import com.snapgram.dto.response.PageResponse;
import com.snapgram.dto.response.PostResponse;
import com.snapgram.dto.response.UserResponse;
import com.snapgram.exception.*;
import com.snapgram.model.Notification;
import com.snapgram.model.Post;
import com.snapgram.model.User;
import com.snapgram.repository.PostRepository;
import com.snapgram.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * BUG FIX: post.isPinned() -> post.isPinned() is correct because field was renamed to "pinned"
 *           and Lombok generates isPinned() getter from field "pinned".
 * BUG FIX: post.setPinned(false) inside lambda — fixed lambda variable capture issue.
 *           The old code used "p.setPinned(false)" in a forEach which was correct,
 *           but then "post.setPinned(!post.isPinned())" referenced outer variable correctly.
 * BUG FIX: post.isCommentsDisabled() — field "commentsDisabled" generates isCommentsDisabled() correctly.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PostService {

    private final PostRepository      postRepository;
    private final UserRepository      userRepository;
    private final CloudinaryService   cloudinaryService;
    private final NotificationService notificationService;
    private final UserService         userService;

    // ── CREATE ────────────────────────────────────────────────────────────────

    public PostResponse createPost(String userId, CreatePostRequest request, List<MultipartFile> files) {
        if ((files == null || files.isEmpty()) &&
                !Post.PostStatus.DRAFT.name().equals(request.getStatus())) {
            throw new BadRequestException("At least one image is required to publish a post");
        }

        List<String> mediaUrls      = new ArrayList<>();
        List<String> mediaPublicIds = new ArrayList<>();

        if (files != null && !files.isEmpty()) {
            List<Map<String, String>> uploads = cloudinaryService.uploadMultipleImages(files, "posts");
            uploads.forEach(r -> {
                mediaUrls.add(r.get("url"));
                mediaPublicIds.add(r.get("publicId"));
            });
        }

        Post.PostStatus status = "DRAFT".equals(request.getStatus())
                ? Post.PostStatus.DRAFT : Post.PostStatus.PUBLISHED;

        Post post = Post.builder()
                .userId(userId)
                .mediaUrls(mediaUrls)
                .mediaPublicIds(mediaPublicIds)
                .caption(request.getCaption())
                .location(request.getLocation())
                .hashtags(request.getHashtags()          != null ? request.getHashtags()          : new ArrayList<>())
                .mentionedUserIds(request.getMentionedUserIds() != null ? request.getMentionedUserIds() : new ArrayList<>())
                .status(status)
                .commentsDisabled(request.isCommentsDisabled())
                .build();

        Post saved = postRepository.save(post);

        // Notify mentioned users
        if (request.getMentionedUserIds() != null && !request.getMentionedUserIds().isEmpty()) {
            userRepository.findById(userId).ifPresent(author ->
                request.getMentionedUserIds().forEach(mentionedId ->
                    notificationService.createNotification(
                        mentionedId, userId, Notification.NotificationType.MENTION,
                        saved.getId(), "POST",
                        author.getUsername() + " mentioned you in a post"
                    )
                )
            );
        }
        log.info("Post created: {} by user: {}", saved.getId(), userId);
        return toPostResponse(saved, userId);
    }

    // ── READ ─────────────────────────────────────────────────────────────────

    public PostResponse getPostById(String postId, String viewerId) {
        Post post = findPublicPost(postId);
        post.setViewCount(post.getViewCount() + 1);
        postRepository.save(post);
        return toPostResponse(post, viewerId);
    }

    public PageResponse<PostResponse> getGlobalFeed(String viewerId, int page, int size, String sort) {
        Sort sorting = "popular".equals(sort)
                ? Sort.by(Sort.Direction.DESC, "likedByUserIds")
                : Sort.by(Sort.Direction.DESC, "createdAt");
        Page<Post> posts = postRepository.findAllPublished(PageRequest.of(page, size, sorting));
        return buildPageResponse(posts, viewerId, page, size);
    }

    public PageResponse<PostResponse> getFollowingFeed(String userId, int page, int size) {
        User user = findUser(userId);
        if (user.getFollowingIds().isEmpty()) {
            return emptyPage(page, size);
        }
        Page<Post> posts = postRepository.findFeedByUserIds(
                user.getFollowingIds(),
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        return buildPageResponse(posts, userId, page, size);
    }

    public PageResponse<PostResponse> getUserPosts(String targetUserId, String viewerId, int page, int size) {
        Page<Post> posts = postRepository.findPublishedByUserId(
                targetUserId, PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        return buildPageResponse(posts, viewerId, page, size);
    }

    public PageResponse<PostResponse> getArchivedPosts(String userId, int page, int size) {
        Page<Post> posts = postRepository.findArchivedByUserId(
                userId, PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        return buildPageResponse(posts, userId, page, size);
    }

    public List<PostResponse> getDraftPosts(String userId) {
        return postRepository.findDraftsByUserId(userId).stream()
                .map(p -> toPostResponse(p, userId)).toList();
    }

    public PageResponse<PostResponse> getPostsByHashtag(String hashtag, String viewerId, int page, int size) {
        Page<Post> posts = postRepository.findByHashtag(
                hashtag.toLowerCase(),
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        return buildPageResponse(posts, viewerId, page, size);
    }

    public PageResponse<PostResponse> getSavedPosts(String userId, int page, int size) {
        User user = findUser(userId);
        List<String> savedIds = user.getSavedPostIds();
        int start = page * size;

        if (start >= savedIds.size()) return emptyPage(page, size);

        int end   = Math.min(start + size, savedIds.size());
        List<PostResponse> posts = savedIds.subList(start, end).stream()
                .map(id -> postRepository.findById(id).orElse(null))
                .filter(p -> p != null && p.getStatus() == Post.PostStatus.PUBLISHED)
                .map(p -> toPostResponse(p, userId))
                .toList();

        int totalPages = (int) Math.ceil((double) savedIds.size() / size);
        return PageResponse.<PostResponse>builder()
                .content(posts).page(page).size(size)
                .totalElements(savedIds.size()).totalPages(totalPages)
                .last(end >= savedIds.size()).first(page == 0)
                .build();
    }

    // ── UPDATE ────────────────────────────────────────────────────────────────

    public PostResponse updatePost(String postId, String userId, CreatePostRequest request) {
        Post post = getOwnedPost(postId, userId);
        if (request.getCaption()          != null) post.setCaption(request.getCaption());
        if (request.getLocation()         != null) post.setLocation(request.getLocation());
        if (request.getHashtags()         != null) post.setHashtags(request.getHashtags());
        if (request.getMentionedUserIds() != null) post.setMentionedUserIds(request.getMentionedUserIds());
        post.setCommentsDisabled(request.isCommentsDisabled());
        return toPostResponse(postRepository.save(post), userId);
    }

    public void deletePost(String postId, String userId) {
        Post post = getOwnedPost(postId, userId);
        post.setStatus(Post.PostStatus.DELETED);
        postRepository.save(post);
        cloudinaryService.deleteMultipleResources(post.getMediaPublicIds());
        log.info("Post {} deleted by {}", postId, userId);
    }

    public void archivePost(String postId, String userId) {
        Post post = getOwnedPost(postId, userId);
        post.setStatus(post.getStatus() == Post.PostStatus.ARCHIVED
                ? Post.PostStatus.PUBLISHED : Post.PostStatus.ARCHIVED);
        postRepository.save(post);
    }

    public void pinPost(String postId, String userId) {
        Post post = getOwnedPost(postId, userId);
        boolean willBePinned = !post.isPinned();  // FIX: field "pinned", getter isPinned()

        // Unpin all other posts first — FIX: no lambda variable capture issue
        List<Post> pinned = postRepository.findPinnedByUserId(userId);
        pinned.forEach(p -> {
            p.setPinned(false);  // FIX: field "pinned", setter setPinned()
            postRepository.save(p);
        });

        post.setPinned(willBePinned);
        postRepository.save(post);
    }

    // ── LIKE / REACT ─────────────────────────────────────────────────────────

    public PostResponse likePost(String postId, String userId) {
        Post post = findPublicPost(postId);
        if (post.getLikedByUserIds().contains(userId)) {
            post.getLikedByUserIds().remove(userId);
        } else {
            post.getLikedByUserIds().add(userId);
            if (!post.getUserId().equals(userId)) {
                userRepository.findById(userId).ifPresent(liker ->
                    notificationService.createNotification(
                        post.getUserId(), userId,
                        Notification.NotificationType.LIKE,
                        postId, "POST",
                        liker.getUsername() + " liked your post"
                    )
                );
            }
        }
        return toPostResponse(postRepository.save(post), userId);
    }

    public PostResponse reactToPost(String postId, String userId, String emoji) {
        Post post = findPublicPost(postId);
        post.getReactions().removeIf(r -> r.getUserId().equals(userId));
        if (emoji != null && !emoji.isBlank()) {
            post.getReactions().add(Post.Reaction.builder()
                    .userId(userId).emoji(emoji).createdAt(LocalDateTime.now()).build());
        }
        return toPostResponse(postRepository.save(post), userId);
    }

    // ── SAVE / UNSAVE ────────────────────────────────────────────────────────

    public void savePost(String postId, String userId) {
        postRepository.findById(postId)
                .orElseThrow(() -> new ResourceNotFoundException("Post", postId));
        User user = findUser(userId);
        if (user.getSavedPostIds().contains(postId)) {
            user.getSavedPostIds().remove(postId);
        } else {
            user.getSavedPostIds().add(0, postId);
        }
        userRepository.save(user);
    }

    // ── HELPERS ──────────────────────────────────────────────────────────────

    private Post findPublicPost(String postId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new ResourceNotFoundException("Post", postId));
        if (post.getStatus() == Post.PostStatus.DELETED) {
            throw new ResourceNotFoundException("Post", postId);
        }
        return post;
    }

    private Post getOwnedPost(String postId, String userId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new ResourceNotFoundException("Post", postId));
        if (!post.getUserId().equals(userId)) {
            throw new ForbiddenException("You don't have permission to modify this post");
        }
        return post;
    }

    private User findUser(String userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));
    }

    public PostResponse toPostResponse(Post post, String viewerId) {
        User postUser = userRepository.findById(post.getUserId()).orElse(null);
        UserResponse userResponse = postUser != null
                ? userService.toUserResponse(postUser, viewerId) : null;

        List<UserResponse> mentionedUsers = post.getMentionedUserIds().stream()
                .map(id -> userRepository.findById(id)
                        .map(u -> userService.toUserResponse(u, viewerId)).orElse(null))
                .filter(u -> u != null).toList();

        PostResponse.PostResponseBuilder b = PostResponse.builder()
                .id(post.getId())
                .user(userResponse)
                .mediaUrls(post.getMediaUrls())
                .caption(post.getCaption())
                .location(post.getLocation())
                .hashtags(post.getHashtags())
                .mentionedUsers(mentionedUsers)
                .likeCount(post.getLikeCount())
                .commentCount(post.getCommentCount())
                .viewCount(post.getViewCount())
                .status(post.getStatus().name())
                .commentsDisabled(post.isCommentsDisabled())
                .isPinned(post.isPinned())      // FIX: field "pinned" -> getter isPinned()
                .pinnedCommentId(post.getPinnedCommentId())
                .createdAt(post.getCreatedAt())
                .updatedAt(post.getUpdatedAt());

        if (viewerId != null) {
            b.isLiked(post.getLikedByUserIds().contains(viewerId));
            post.getReactions().stream()
                    .filter(r -> r.getUserId().equals(viewerId))
                    .findFirst()
                    .ifPresent(r -> b.viewerReaction(r.getEmoji()));
            userRepository.findById(viewerId).ifPresent(viewer ->
                    b.isSaved(viewer.getSavedPostIds().contains(post.getId())));
        }
        return b.build();
    }

    private PageResponse<PostResponse> buildPageResponse(Page<Post> posts, String viewerId, int page, int size) {
        return PageResponse.<PostResponse>builder()
                .content(posts.getContent().stream().map(p -> toPostResponse(p, viewerId)).toList())
                .page(page).size(size)
                .totalElements(posts.getTotalElements())
                .totalPages(posts.getTotalPages())
                .last(posts.isLast()).first(posts.isFirst())
                .build();
    }

    private <T> PageResponse<T> emptyPage(int page, int size) {
        return PageResponse.<T>builder()
                .content(List.of()).page(page).size(size)
                .totalElements(0).totalPages(0).last(true).first(page == 0)
                .build();
    }
}
