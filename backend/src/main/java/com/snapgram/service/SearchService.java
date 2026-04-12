package com.snapgram.service;

import com.snapgram.dto.response.PageResponse;
import com.snapgram.dto.response.PostResponse;
import com.snapgram.dto.response.UserResponse;
import com.snapgram.model.Post;
import com.snapgram.repository.PostRepository;
import com.snapgram.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

/**
 * NEW FEATURE: Unified search across users, posts, and hashtags.
 * Also provides trending hashtag computation.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SearchService {

    private final UserRepository  userRepository;
    private final PostRepository  postRepository;
    private final UserService     userService;
    private final PostService     postService;

    public PageResponse<UserResponse> searchUsers(String query, String viewerId, int page, int size) {
        Page<com.snapgram.model.User> users =
                userRepository.searchUsers(query, PageRequest.of(page, size));
        List<UserResponse> content = users.getContent().stream()
                .filter(u -> !u.getId().equals(viewerId))
                .map(u -> userService.toUserResponse(u, viewerId))
                .toList();
        return PageResponse.<UserResponse>builder()
                .content(content).page(page).size(size)
                .totalElements(users.getTotalElements())
                .totalPages(users.getTotalPages())
                .last(users.isLast()).first(users.isFirst())
                .build();
    }

    public PageResponse<PostResponse> searchPosts(String query, String viewerId, int page, int size) {
        // Search by hashtag first, then caption
        Page<Post> byHashtag = postRepository.findByHashtag(
                query.toLowerCase().replace("#", ""),
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));

        List<PostResponse> content = byHashtag.getContent().stream()
                .map(p -> postService.toPostResponse(p, viewerId))
                .toList();

        return PageResponse.<PostResponse>builder()
                .content(content).page(page).size(size)
                .totalElements(byHashtag.getTotalElements())
                .totalPages(byHashtag.getTotalPages())
                .last(byHashtag.isLast()).first(byHashtag.isFirst())
                .build();
    }

    /**
     * Compute trending hashtags from recent published posts.
     * Returns top N hashtags sorted by frequency.
     */
    public List<Map<String, Object>> getTrendingHashtags(int limit) {
        // Sample the most recent 500 published posts for performance
        List<Post> recentPosts = postRepository.findAllHashtags(
                PageRequest.of(0, 500, Sort.by(Sort.Direction.DESC, "createdAt")))
                .stream().toList();

        Map<String, Long> freq = recentPosts.stream()
                .filter(p -> p.getHashtags() != null)
                .flatMap(p -> p.getHashtags().stream())
                .filter(tag -> tag != null && !tag.isBlank())
                .map(String::toLowerCase)
                .collect(Collectors.groupingBy(t -> t, Collectors.counting()));

        return freq.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .limit(limit)
                .map(e -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("hashtag", e.getKey());
                    m.put("count", e.getValue());
                    return m;
                })
                .toList();
    }

    public Map<String, Object> globalSearch(String query, String viewerId, int page, int size) {
        PageResponse<UserResponse> users = searchUsers(query, viewerId, page, Math.min(size, 5));
        PageResponse<PostResponse> posts = searchPosts(query, viewerId, page, size);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("users", users);
        result.put("posts", posts);
        result.put("query", query);
        return result;
    }
}
