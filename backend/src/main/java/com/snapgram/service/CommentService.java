package com.snapgram.service;

import com.snapgram.dto.request.CreateCommentRequest;
import com.snapgram.dto.response.CommentResponse;
import com.snapgram.dto.response.PageResponse;
import com.snapgram.exception.*;
import com.snapgram.model.Comment;
import com.snapgram.model.Notification;
import com.snapgram.model.Post;
import com.snapgram.model.User;
import com.snapgram.repository.CommentRepository;
import com.snapgram.repository.PostRepository;
import com.snapgram.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * BUG FIX: comment.isPinned() -> comment.isPinned()  (field renamed "pinned", getter isPinned())
 * BUG FIX: comment.isDeleted() -> comment.isDeleted() (field renamed "deleted", getter isDeleted())
 * BUG FIX: comment.setPinned() / comment.setDeleted() match renamed fields.
 * BUG FIX: countByPostIdAndIsDeleted -> countByPostIdAndDeleted to match field rename.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CommentService {

    private final CommentRepository   commentRepository;
    private final PostRepository      postRepository;
    private final UserRepository      userRepository;
    private final NotificationService notificationService;
    private final UserService         userService;

    public CommentResponse createComment(String postId, String userId, CreateCommentRequest request) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new ResourceNotFoundException("Post", postId));

        if (post.isCommentsDisabled()) {
            throw new ForbiddenException("Comments are disabled on this post");
        }
        if (request.getParentCommentId() != null) {
            commentRepository.findById(request.getParentCommentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Comment", request.getParentCommentId()));
        }

        Comment comment = Comment.builder()
                .postId(postId)
                .userId(userId)
                .parentCommentId(request.getParentCommentId())
                .content(request.getContent())
                .mentionedUserIds(request.getMentionedUserIds() != null
                        ? request.getMentionedUserIds() : List.of())
                .build();

        Comment saved = commentRepository.save(comment);

        post.setCommentCount(post.getCommentCount() + 1);
        postRepository.save(post);

        if (request.getParentCommentId() != null) {
            commentRepository.findById(request.getParentCommentId()).ifPresent(parent -> {
                parent.setReplyCount(parent.getReplyCount() + 1);
                commentRepository.save(parent);
            });
        }

        userRepository.findById(userId).ifPresent(commenter -> {
            if (request.getParentCommentId() != null) {
                commentRepository.findById(request.getParentCommentId()).ifPresent(parent -> {
                    if (!parent.getUserId().equals(userId)) {
                        notificationService.createNotification(
                            parent.getUserId(), userId, Notification.NotificationType.REPLY,
                            saved.getId(), "COMMENT",
                            commenter.getUsername() + " replied to your comment");
                    }
                });
            } else if (!post.getUserId().equals(userId)) {
                notificationService.createNotification(
                    post.getUserId(), userId, Notification.NotificationType.COMMENT,
                    postId, "POST",
                    commenter.getUsername() + " commented on your post");
            }

            if (request.getMentionedUserIds() != null) {
                request.getMentionedUserIds().forEach(mentionedId ->
                    notificationService.createNotification(
                        mentionedId, userId, Notification.NotificationType.MENTION,
                        postId, "POST",
                        commenter.getUsername() + " mentioned you in a comment")
                );
            }
        });

        return toCommentResponse(saved, userId);
    }

    public PageResponse<CommentResponse> getPostComments(String postId, String viewerId, int page, int size) {
        Page<Comment> comments = commentRepository.findTopLevelByPostId(
                postId, PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        return buildPage(comments, viewerId, page, size);
    }

    public PageResponse<CommentResponse> getReplies(String commentId, String viewerId, int page, int size) {
        Page<Comment> replies = commentRepository.findRepliesByParentId(
                commentId, PageRequest.of(page, size, Sort.by(Sort.Direction.ASC, "createdAt")));
        return buildPage(replies, viewerId, page, size);
    }

    public CommentResponse likeComment(String commentId, String userId) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Comment", commentId));
        if (comment.getLikedByUserIds().contains(userId)) {
            comment.getLikedByUserIds().remove(userId);
        } else {
            comment.getLikedByUserIds().add(userId);
        }
        return toCommentResponse(commentRepository.save(comment), userId);
    }

    public void deleteComment(String commentId, String userId) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Comment", commentId));

        Post post = postRepository.findById(comment.getPostId()).orElse(null);
        boolean isCommentOwner = comment.getUserId().equals(userId);
        boolean isPostOwner    = post != null && post.getUserId().equals(userId);

        if (!isCommentOwner && !isPostOwner) {
            throw new ForbiddenException("You don't have permission to delete this comment");
        }

        comment.setDeleted(true);        // FIX: field "deleted", setter setDeleted()
        comment.setContent("[deleted]");
        commentRepository.save(comment);

        if (post != null) {
            post.setCommentCount(Math.max(0, post.getCommentCount() - 1));
            postRepository.save(post);
        }
    }

    public CommentResponse pinComment(String postId, String commentId, String userId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new ResourceNotFoundException("Post", postId));
        if (!post.getUserId().equals(userId)) {
            throw new ForbiddenException("Only post owner can pin comments");
        }

        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Comment", commentId));

        // Unpin existing
        if (post.getPinnedCommentId() != null) {
            commentRepository.findById(post.getPinnedCommentId()).ifPresent(c -> {
                c.setPinned(false);    // FIX: field "pinned", setter setPinned()
                commentRepository.save(c);
            });
        }

        boolean willPin = !comment.isPinned();   // FIX: getter isPinned()
        comment.setPinned(willPin);
        post.setPinnedCommentId(willPin ? commentId : null);
        postRepository.save(post);

        return toCommentResponse(commentRepository.save(comment), userId);
    }

    private CommentResponse toCommentResponse(Comment comment, String viewerId) {
        User user = userRepository.findById(comment.getUserId()).orElse(null);
        return CommentResponse.builder()
                .id(comment.getId())
                .postId(comment.getPostId())
                .user(user != null ? userService.toUserResponse(user, viewerId) : null)
                .parentCommentId(comment.getParentCommentId())
                .content(comment.isDeleted() ? "[deleted]" : comment.getContent())
                .likeCount(comment.getLikeCount())
                .replyCount(comment.getReplyCount())
                .isPinned(comment.isPinned())      // FIX: getter
                .isDeleted(comment.isDeleted())    // FIX: getter
                .createdAt(comment.getCreatedAt())
                .updatedAt(comment.getUpdatedAt())
                .isLiked(viewerId != null && comment.getLikedByUserIds().contains(viewerId))
                .build();
    }

    private PageResponse<CommentResponse> buildPage(Page<Comment> page, String viewerId, int pageNum, int size) {
        return PageResponse.<CommentResponse>builder()
                .content(page.getContent().stream().map(c -> toCommentResponse(c, viewerId)).toList())
                .page(pageNum).size(size)
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .last(page.isLast()).first(page.isFirst())
                .build();
    }
}
