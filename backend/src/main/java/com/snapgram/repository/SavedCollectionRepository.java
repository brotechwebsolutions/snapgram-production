package com.snapgram.repository;

import com.snapgram.model.SavedCollection;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SavedCollectionRepository extends MongoRepository<SavedCollection, String> {
    List<SavedCollection> findByUserIdOrderByCreatedAtDesc(String userId);
    Optional<SavedCollection> findByIdAndUserId(String id, String userId);
    void deleteByUserId(String userId);
}
