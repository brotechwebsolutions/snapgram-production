package com.snapgram.service;

import com.snapgram.dto.request.CreateNoteRequest;
import com.snapgram.dto.response.NoteResponse;
import com.snapgram.exception.ForbiddenException;
import com.snapgram.exception.ResourceNotFoundException;
import com.snapgram.model.Note;
import com.snapgram.model.User;
import com.snapgram.repository.NoteRepository;
import com.snapgram.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class NoteService {

    private final NoteRepository  noteRepository;
    private final UserRepository  userRepository;
    private final UserService     userService;

    public NoteResponse createOrUpdateNote(String userId, CreateNoteRequest request) {
        // Delete any existing active note
        noteRepository.findByUserIdAndExpiresAtAfter(userId, LocalDateTime.now())
                .ifPresent(noteRepository::delete);

        Note.NotePrivacy privacy = Note.NotePrivacy.FOLLOWERS;
        if (request.getPrivacy() != null) {
            try { privacy = Note.NotePrivacy.valueOf(request.getPrivacy()); }
            catch (IllegalArgumentException ignored) {}
        }

        Note note = Note.builder()
                .userId(userId)
                .content(request.getContent())
                .privacy(privacy)
                .expiresAt(LocalDateTime.now().plusHours(24))
                .build();

        return toNoteResponse(noteRepository.save(note));
    }

    public void deleteNote(String noteId, String userId) {
        Note note = noteRepository.findById(noteId)
                .orElseThrow(() -> new ResourceNotFoundException("Note", noteId));
        if (!note.getUserId().equals(userId)) {
            throw new ForbiddenException("You can only delete your own notes");
        }
        noteRepository.delete(note);
    }

    public List<NoteResponse> getFeedNotes(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        List<String> ids = new ArrayList<>(user.getFollowingIds());
        ids.add(userId);

        return noteRepository.findActiveNotesByUserIds(ids, LocalDateTime.now())
                .stream()
                .filter(n -> canViewNote(n, userId, user))
                .map(this::toNoteResponse)
                .toList();
    }

    private boolean canViewNote(Note note, String viewerId, User viewer) {
        if (note.getUserId().equals(viewerId)) return true;
        return switch (note.getPrivacy()) {
            case EVERYONE -> true;
            case FOLLOWERS -> {
                User owner = userRepository.findById(note.getUserId()).orElse(null);
                yield owner != null && owner.getFollowerIds().contains(viewerId);
            }
            case CLOSE_FRIENDS -> {
                User owner = userRepository.findById(note.getUserId()).orElse(null);
                yield owner != null && owner.getCloseFriendIds().contains(viewerId);
            }
        };
    }

    private NoteResponse toNoteResponse(Note note) {
        User user = userRepository.findById(note.getUserId()).orElse(null);
        return NoteResponse.builder()
                .id(note.getId())
                .user(user != null ? userService.toUserResponse(user, null) : null)
                .content(note.getContent())
                .privacy(note.getPrivacy().name())
                .expiresAt(note.getExpiresAt())
                .createdAt(note.getCreatedAt())
                .build();
    }
}
