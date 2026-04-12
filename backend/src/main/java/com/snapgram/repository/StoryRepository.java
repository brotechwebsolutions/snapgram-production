package com.snapgram.repository;

import com.snapgram.model.Story;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface StoryRepository extends MongoRepository<Story, String> {

    @Query("{ 'userId': ?0, 'expiresAt': { $gt: ?1 } }")
    List<Story> findActiveStoriesByUserId(String userId, LocalDateTime now);

    @Query("{ 'userId': { $in: ?0 }, 'expiresAt': { $gt: ?1 } }")
    List<Story> findActiveStoriesByUserIds(List<String> userIds, LocalDateTime now);

    @Query("{ 'expiresAt': { $lt: ?0 } }")
    List<Story> findExpiredStories(LocalDateTime now);

    void deleteByUserId(String userId);
}
