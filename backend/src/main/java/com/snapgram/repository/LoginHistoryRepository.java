package com.snapgram.repository;

import com.snapgram.model.LoginHistory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * BUG FIX: "isActive" field renamed to "active" in LoginHistory model.
 */
@Repository
public interface LoginHistoryRepository extends MongoRepository<LoginHistory, String> {

    Page<LoginHistory> findByUserIdOrderByLoginAtDesc(String userId, Pageable pageable);

    Optional<LoginHistory> findBySessionToken(String sessionToken);

    void deleteByUserId(String userId);
}
