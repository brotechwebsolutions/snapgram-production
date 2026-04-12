package com.snapgram.controller;

import com.snapgram.dto.request.CreateCommentRequest;
import com.snapgram.dto.response.*;
import com.snapgram.security.service.UserDetailsImpl;
import com.snapgram.service.CommentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class CommentController {

    private final CommentService commentService;

    @PostMapping("/posts/{postId}/comments")
    public ResponseEntity<ApiResponse<CommentResponse>> create(
            @PathVariable String postId,
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @Valid @RequestBody CreateCommentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Comment added",
                commentService.createComment(postId, userDetails.getId(), request)));
    }

    @GetMapping("/posts/{postId}/comments")
    public ResponseEntity<ApiResponse<PageResponse<CommentResponse>>> getPostComments(
            @PathVariable String postId,
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size) {
        String viewerId = userDetails != null ? userDetails.getId() : null;
        return ResponseEntity.ok(ApiResponse.success(
                commentService.getPostComments(postId, viewerId, page, size)));
    }

    @GetMapping("/comments/{commentId}/replies")
    public ResponseEntity<ApiResponse<PageResponse<CommentResponse>>> getReplies(
            @PathVariable String commentId,
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size) {
        String viewerId = userDetails != null ? userDetails.getId() : null;
        return ResponseEntity.ok(ApiResponse.success(
                commentService.getReplies(commentId, viewerId, page, size)));
    }

    @PostMapping("/comments/{commentId}/like")
    public ResponseEntity<ApiResponse<CommentResponse>> likeComment(
            @PathVariable String commentId,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                commentService.likeComment(commentId, userDetails.getId())));
    }

    @DeleteMapping("/comments/{commentId}")
    public ResponseEntity<ApiResponse<Void>> deleteComment(
            @PathVariable String commentId,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        commentService.deleteComment(commentId, userDetails.getId());
        return ResponseEntity.ok(ApiResponse.success("Comment deleted", null));
    }

    @PostMapping("/posts/{postId}/comments/{commentId}/pin")
    public ResponseEntity<ApiResponse<CommentResponse>> pinComment(
            @PathVariable String postId,
            @PathVariable String commentId,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return ResponseEntity.ok(ApiResponse.success("Pin status updated",
                commentService.pinComment(postId, commentId, userDetails.getId())));
    }
}
