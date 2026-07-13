package com.snapgram.controller;

import com.snapgram.dto.request.SendMessageRequest;
import com.snapgram.dto.response.*;
import com.snapgram.security.service.UserDetailsImpl;
import com.snapgram.service.MessageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/messages")
@RequiredArgsConstructor
public class MessageController {

    private final MessageService messageService;

    @PostMapping(consumes = "multipart/form-data")
    public ResponseEntity<ApiResponse<MessageResponse>> sendMessage(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestPart("data") SendMessageRequest request,
            @RequestPart(value = "file", required = false) MultipartFile file) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Message sent",
                messageService.sendMessage(userDetails.getId(), request, file)));
    }

    @GetMapping("/conversations")
    public ResponseEntity<ApiResponse<List<ConversationResponse>>> getConversations(
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                messageService.getConversations(userDetails.getId())));
    }

    @GetMapping("/conversations/{conversationId}")
    public ResponseEntity<ApiResponse<PageResponse<MessageResponse>>> getMessages(
            @PathVariable String conversationId,
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "30") int size) {
        return ResponseEntity.ok(ApiResponse.success(
                messageService.getMessages(conversationId, userDetails.getId(), page, size)));
    }

    @PostMapping("/conversations/{conversationId}/typing")
    public ResponseEntity<ApiResponse<Void>> typing(
            @PathVariable String conversationId,
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestBody Map<String, Boolean> body) {
        messageService.sendTypingIndicator(conversationId, userDetails.getId(),
                Boolean.TRUE.equals(body.get("isTyping")));
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @PostMapping("/{messageId}/seen")
    public ResponseEntity<ApiResponse<Void>> markSeen(
            @PathVariable String messageId,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        messageService.markMessageSeen(messageId, userDetails.getId());
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @PutMapping("/{messageId}")
    public ResponseEntity<ApiResponse<MessageResponse>> editMessage(
            @PathVariable String messageId,
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(ApiResponse.success("Message updated",
                messageService.editMessage(messageId, userDetails.getId(), body.get("content"))));
    }

    @DeleteMapping("/{messageId}")
    public ResponseEntity<ApiResponse<Void>> deleteMessage(
            @PathVariable String messageId,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        messageService.deleteMessage(messageId, userDetails.getId());
        return ResponseEntity.ok(ApiResponse.success("Message deleted", null));
    }

    @PostMapping("/conversations/{conversationId}/pin")
    public ResponseEntity<ApiResponse<Void>> pinConversation(
            @PathVariable String conversationId,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        messageService.pinConversation(conversationId, userDetails.getId());
        return ResponseEntity.ok(ApiResponse.success("Pin status updated", null));
    }
}
