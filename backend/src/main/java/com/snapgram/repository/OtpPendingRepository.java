package com.snapgram.repository;

import com.snapgram.model.OtpPending;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface OtpPendingRepository extends MongoRepository<OtpPending, String> {

    Optional<OtpPending> findByEmail(String email);

    void deleteByEmail(String email);

    /** Used by cleanup scheduler to purge expired records */
    List<OtpPending> findByExpiresAtBefore(LocalDateTime now);
}
