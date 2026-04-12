package com.snapgram.service;

import com.snapgram.model.Post;
import com.snapgram.repository.PostRepository;
import com.snapgram.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * NEW FEATURE: Analytics service for post and profile stats.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AnalyticsService {

    private final PostRepository postRepository;
    private final UserRepository userRepository;

    /** Per-post analytics: views, likes, comments, saves, engagement rate */
    public Map<String, Object> getPostAnalytics(String postId, String userId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new com.snapgram.exception.ResourceNotFoundException("Post", postId));
        if (!post.getUserId().equals(userId)) {
            throw new com.snapgram.exception.ForbiddenException("Access denied");
        }

        long totalEngagements = (long) post.getLikeCount() + post.getCommentCount()
                + post.getReactions().size();
        double engagementRate = post.getViewCount() > 0
                ? (totalEngagements * 100.0) / post.getViewCount() : 0;

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("postId",         post.getId());
        stats.put("views",          post.getViewCount());
        stats.put("likes",          post.getLikeCount());
        stats.put("comments",       post.getCommentCount());
        stats.put("reactions",      post.getReactions().size());
        stats.put("engagementRate", Math.round(engagementRate * 100.0) / 100.0);
        stats.put("createdAt",      post.getCreatedAt());
        return stats;
    }

    /** Profile analytics: post count, total views, total likes, follower count */
    public Map<String, Object> getProfileAnalytics(String userId) {
        com.snapgram.model.User user = userRepository.findById(userId)
                .orElseThrow(() -> new com.snapgram.exception.ResourceNotFoundException("User", userId));

        List<Post> posts = postRepository.findPublishedByUserId(
                userId,
                PageRequest.of(0, Integer.MAX_VALUE, Sort.by(Sort.Direction.DESC, "createdAt")))
                .getContent();

        long totalViews    = posts.stream().mapToLong(Post::getViewCount).sum();
        long totalLikes    = posts.stream().mapToLong(Post::getLikeCount).sum();
        long totalComments = posts.stream().mapToLong(Post::getCommentCount).sum();

        // Top performing post by engagement
        Post topPost = posts.stream()
                .max(java.util.Comparator.comparingInt(
                        p -> p.getLikeCount() + p.getCommentCount()))
                .orElse(null);

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("userId",        userId);
        stats.put("username",      user.getUsername());
        stats.put("postCount",     posts.size());
        stats.put("followerCount", user.getFollowerCount());
        stats.put("followingCount",user.getFollowingCount());
        stats.put("totalViews",    totalViews);
        stats.put("totalLikes",    totalLikes);
        stats.put("totalComments", totalComments);
        stats.put("topPostId",     topPost != null ? topPost.getId() : null);
        return stats;
    }

    /** Aggregated post stats for all user's posts */
    public List<Map<String, Object>> getAllPostsAnalytics(String userId) {
        return postRepository.findPublishedByUserId(
                userId,
                PageRequest.of(0, 50, Sort.by(Sort.Direction.DESC, "createdAt")))
                .getContent()
                .stream()
                .map(p -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("postId",    p.getId());
                    m.put("thumbnail", p.getMediaUrls().isEmpty() ? null : p.getMediaUrls().get(0));
                    m.put("views",     p.getViewCount());
                    m.put("likes",     p.getLikeCount());
                    m.put("comments",  p.getCommentCount());
                    m.put("createdAt", p.getCreatedAt());
                    return m;
                }).collect(Collectors.toList());
    }
}
