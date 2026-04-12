package com.snapgram.controller;

import com.snapgram.dto.request.CreateNoteRequest;
import com.snapgram.dto.response.ApiResponse;
import com.snapgram.dto.response.NoteResponse;
import com.snapgram.security.service.UserDetailsImpl;
import com.snapgram.service.NoteService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notes")
@RequiredArgsConstructor
public class NoteController {

    private final NoteService noteService;

    @PostMapping
    public ResponseEntity<ApiResponse<NoteResponse>> createNote(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @Valid @RequestBody CreateNoteRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Note created",
                noteService.createOrUpdateNote(userDetails.getId(), request)));
    }

    @GetMapping("/feed")
    public ResponseEntity<ApiResponse<List<NoteResponse>>> feedNotes(
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                noteService.getFeedNotes(userDetails.getId())));
    }

    @DeleteMapping("/{noteId}")
    public ResponseEntity<ApiResponse<Void>> deleteNote(
            @PathVariable String noteId,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        noteService.deleteNote(noteId, userDetails.getId());
        return ResponseEntity.ok(ApiResponse.success("Note deleted", null));
    }
}
