package com.snapgram.controller;

import com.snapgram.dto.request.CreateStoryRequest;
import com.snapgram.dto.response.*;
import com.snapgram.exception.BadRequestException;
import com.snapgram.model.StoryHighlight;
import com.snapgram.security.service.UserDetailsImpl;
import com.snapgram.service.StoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/stories")
@RequiredArgsConstructor
public class StoryController {

    private final StoryService storyService;

    @PostMapping(consumes = "multipart/form-data")
    public ResponseEntity<ApiResponse<StoryResponse>> createStory(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestPart("data") CreateStoryRequest request,
            @RequestPart("file") MultipartFile file) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Story created",
                storyService.createStory(userDetails.getId(), request, file)));
    }

    @GetMapping("/feed")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> feedStories(
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                storyService.getFeedStories(userDetails.getId())));
    }

    @PostMapping("/{storyId}/view")
    public ResponseEntity<ApiResponse<StoryResponse>> viewStory(
            @PathVariable String storyId,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                storyService.viewStory(storyId, userDetails.getId())));
    }

    @PostMapping("/{storyId}/react")
    public ResponseEntity<ApiResponse<Void>> reactToStory(
            @PathVariable String storyId,
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestBody Map<String, String> body) {
        storyService.reactToStory(storyId, userDetails.getId(), body.get("emoji"));
        return ResponseEntity.ok(ApiResponse.success("Reaction added", null));
    }

    @DeleteMapping("/{storyId}")
    public ResponseEntity<ApiResponse<Void>> deleteStory(
            @PathVariable String storyId,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        storyService.deleteStory(storyId, userDetails.getId());
        return ResponseEntity.ok(ApiResponse.success("Story deleted", null));
    }

    @PostMapping("/highlights")
    public ResponseEntity<ApiResponse<StoryHighlight>> createHighlight(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestBody Map<String, Object> body) {
                Object storyIdsObj = body.get("storyIds");
                if (!(storyIdsObj instanceof List<?> rawStoryIds)) {
                        throw new BadRequestException("storyIds must be a list of strings");
                }

                List<String> storyIds = rawStoryIds.stream()
                                .filter(String.class::isInstance)
                                .map(String.class::cast)
                                .toList();

                if (storyIds.isEmpty()) {
                        throw new BadRequestException("storyIds must contain at least one story id");
                }

        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(
                "Highlight created",
                storyService.createHighlight(
                        userDetails.getId(),
                        (String) body.get("title"),
                        (String) body.get("coverImageUrl"),
                        storyIds)));
    }

    @GetMapping("/highlights/user/{userId}")
    public ResponseEntity<ApiResponse<List<StoryHighlight>>> getUserHighlights(
            @PathVariable String userId) {
        return ResponseEntity.ok(ApiResponse.success(
                storyService.getUserHighlights(userId)));
    }

    @DeleteMapping("/highlights/{highlightId}")
    public ResponseEntity<ApiResponse<Void>> deleteHighlight(
            @PathVariable String highlightId,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        storyService.deleteHighlight(highlightId, userDetails.getId());
        return ResponseEntity.ok(ApiResponse.success("Highlight deleted", null));
    }
}
