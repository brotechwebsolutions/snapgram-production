package com.snapgram.repository;

import com.snapgram.model.Note;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface NoteRepository extends MongoRepository<Note, String> {

    Optional<Note> findByUserIdAndExpiresAtAfter(String userId, LocalDateTime now);

    @Query("{ 'userId': { $in: ?0 }, 'expiresAt': { $gt: ?1 } }")
    List<Note> findActiveNotesByUserIds(List<String> userIds, LocalDateTime now);

    @Query("{ 'expiresAt': { $lt: ?0 } }")
    List<Note> findExpiredNotes(LocalDateTime now);

    void deleteByUserId(String userId);
}
