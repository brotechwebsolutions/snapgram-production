package com.snapgram.controller;

import com.snapgram.dto.response.ApiResponse;
import com.snapgram.dto.response.PageResponse;
import com.snapgram.dto.response.PostResponse;
import com.snapgram.dto.response.UserResponse;
import com.snapgram.security.service.UserDetailsImpl;
import com.snapgram.service.SearchService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * NEW: Unified search controller.
 *
 * GET /api/search?q=             - Global search (users + posts)
 * GET /api/search/users?q=       - Search users only
 * GET /api/search/posts?q=       - Search posts by hashtag/caption
 * GET /api/search/trending        - Trending hashtags
 */
@RestController
@RequestMapping("/api/search")
@RequiredArgsConstructor
public class SearchController {

    private final SearchService searchService;

    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> globalSearch(
            @RequestParam String q,
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "10") int size) {
        String viewerId = userDetails != null ? userDetails.getId() : null;
        return ResponseEntity.ok(ApiResponse.success(
                searchService.globalSearch(q, viewerId, page, size)));
    }

    @GetMapping("/users")
    public ResponseEntity<ApiResponse<PageResponse<UserResponse>>> searchUsers(
            @RequestParam String q,
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size) {
        String viewerId = userDetails != null ? userDetails.getId() : null;
        return ResponseEntity.ok(ApiResponse.success(
                searchService.searchUsers(q, viewerId, page, size)));
    }

    @GetMapping("/posts")
    public ResponseEntity<ApiResponse<PageResponse<PostResponse>>> searchPosts(
            @RequestParam String q,
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "12") int size) {
        String viewerId = userDetails != null ? userDetails.getId() : null;
        return ResponseEntity.ok(ApiResponse.success(
                searchService.searchPosts(q, viewerId, page, size)));
    }

    @GetMapping("/trending")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> trending(
            @RequestParam(defaultValue = "20") int limit) {
        return ResponseEntity.ok(ApiResponse.success(
                searchService.getTrendingHashtags(Math.min(limit, 50))));
    }
}
