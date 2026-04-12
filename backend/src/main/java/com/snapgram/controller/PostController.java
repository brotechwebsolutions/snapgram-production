package com.snapgram.controller;

import com.snapgram.dto.request.CreatePostRequest;
import com.snapgram.dto.response.*;
import com.snapgram.security.service.UserDetailsImpl;
import com.snapgram.service.PostService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/posts")
@RequiredArgsConstructor
public class PostController {

    private final PostService postService;

    @PostMapping(consumes = "multipart/form-data")
    public ResponseEntity<ApiResponse<PostResponse>> createPost(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestPart(value = "data") @Valid CreatePostRequest request,
            @RequestPart(value = "files", required = false) List<MultipartFile> files) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(
                "Post created successfully",
                postService.createPost(userDetails.getId(), request, files)));
    }

    @GetMapping("/{postId}")
    public ResponseEntity<ApiResponse<PostResponse>> getPost(
            @PathVariable String postId,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        String viewerId = userDetails != null ? userDetails.getId() : null;
        return ResponseEntity.ok(ApiResponse.success(
                postService.getPostById(postId, viewerId)));
    }

    @PutMapping(value = "/{postId}", consumes = "application/json")
    public ResponseEntity<ApiResponse<PostResponse>> updatePost(
            @PathVariable String postId,
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @Valid @RequestBody CreatePostRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Post updated",
                postService.updatePost(postId, userDetails.getId(), request)));
    }

    @DeleteMapping("/{postId}")
    public ResponseEntity<ApiResponse<Void>> deletePost(
            @PathVariable String postId,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        postService.deletePost(postId, userDetails.getId());
        return ResponseEntity.ok(ApiResponse.success("Post deleted", null));
    }

    @PostMapping("/{postId}/archive")
    public ResponseEntity<ApiResponse<Void>> archivePost(
            @PathVariable String postId,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        postService.archivePost(postId, userDetails.getId());
        return ResponseEntity.ok(ApiResponse.success("Archive status updated", null));
    }

    @PostMapping("/{postId}/pin")
    public ResponseEntity<ApiResponse<Void>> pinPost(
            @PathVariable String postId,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        postService.pinPost(postId, userDetails.getId());
        return ResponseEntity.ok(ApiResponse.success("Pin status updated", null));
    }

    @PostMapping("/{postId}/like")
    public ResponseEntity<ApiResponse<PostResponse>> likePost(
            @PathVariable String postId,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                postService.likePost(postId, userDetails.getId())));
    }

    @PostMapping("/{postId}/react")
    public ResponseEntity<ApiResponse<PostResponse>> reactToPost(
            @PathVariable String postId,
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(ApiResponse.success(
                postService.reactToPost(postId, userDetails.getId(), body.get("emoji"))));
    }

    @PostMapping("/{postId}/save")
    public ResponseEntity<ApiResponse<Void>> savePost(
            @PathVariable String postId,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        postService.savePost(postId, userDetails.getId());
        return ResponseEntity.ok(ApiResponse.success("Save status updated", null));
    }

    @GetMapping("/feed/global")
    public ResponseEntity<ApiResponse<PageResponse<PostResponse>>> globalFeed(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestParam(defaultValue = "0")      int page,
            @RequestParam(defaultValue = "10")     int size,
            @RequestParam(defaultValue = "latest") String sort) {
        String viewerId = userDetails != null ? userDetails.getId() : null;
        return ResponseEntity.ok(ApiResponse.success(
                postService.getGlobalFeed(viewerId, page, size, sort)));
    }

    @GetMapping("/feed/following")
    public ResponseEntity<ApiResponse<PageResponse<PostResponse>>> followingFeed(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(ApiResponse.success(
                postService.getFollowingFeed(userDetails.getId(), page, size)));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<ApiResponse<PageResponse<PostResponse>>> userPosts(
            @PathVariable String userId,
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "12") int size) {
        String viewerId = userDetails != null ? userDetails.getId() : null;
        return ResponseEntity.ok(ApiResponse.success(
                postService.getUserPosts(userId, viewerId, page, size)));
    }

    @GetMapping("/saved")
    public ResponseEntity<ApiResponse<PageResponse<PostResponse>>> savedPosts(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "12") int size) {
        return ResponseEntity.ok(ApiResponse.success(
                postService.getSavedPosts(userDetails.getId(), page, size)));
    }

    @GetMapping("/archived")
    public ResponseEntity<ApiResponse<PageResponse<PostResponse>>> archivedPosts(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "12") int size) {
        return ResponseEntity.ok(ApiResponse.success(
                postService.getArchivedPosts(userDetails.getId(), page, size)));
    }

    @GetMapping("/drafts")
    public ResponseEntity<ApiResponse<List<PostResponse>>> drafts(
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                postService.getDraftPosts(userDetails.getId())));
    }

    @GetMapping("/hashtag/{hashtag}")
    public ResponseEntity<ApiResponse<PageResponse<PostResponse>>> byHashtag(
            @PathVariable String hashtag,
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "12") int size) {
        String viewerId = userDetails != null ? userDetails.getId() : null;
        return ResponseEntity.ok(ApiResponse.success(
                postService.getPostsByHashtag(hashtag, viewerId, page, size)));
    }
}
