package com.snapgram.repository;

import com.snapgram.model.StoryHighlight;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StoryHighlightRepository extends MongoRepository<StoryHighlight, String> {
    List<StoryHighlight> findByUserIdOrderByCreatedAtDesc(String userId);
    void deleteByUserId(String userId);
}
