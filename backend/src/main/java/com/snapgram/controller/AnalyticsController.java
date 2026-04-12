package com.snapgram.controller;

import com.snapgram.dto.response.ApiResponse;
import com.snapgram.security.service.UserDetailsImpl;
import com.snapgram.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * NEW: Analytics endpoints.
 *
 * GET /api/analytics/profile          - Current user's profile stats
 * GET /api/analytics/posts            - All posts engagement stats
 * GET /api/analytics/posts/{postId}   - Single post analytics
 */
@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    @GetMapping("/profile")
    public ResponseEntity<ApiResponse<Map<String, Object>>> profileAnalytics(
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                analyticsService.getProfileAnalytics(userDetails.getId())));
    }

    @GetMapping("/posts")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> allPostsAnalytics(
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                analyticsService.getAllPostsAnalytics(userDetails.getId())));
    }

    @GetMapping("/posts/{postId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> postAnalytics(
            @PathVariable String postId,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                analyticsService.getPostAnalytics(postId, userDetails.getId())));
    }
}
