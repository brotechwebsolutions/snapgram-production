package com.snapgram.repository;

import com.snapgram.model.Message;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

/**
 * BUG FIX: "isDeleted" field renamed to "deleted" in Message model.
 */
@Repository
public interface MessageRepository extends MongoRepository<Message, String> {

    // FIX: was "isDeleted" -> now "deleted"
    @Query("{ 'conversationId': ?0, 'deleted': false }")
    Page<Message> findByConversationId(String conversationId, Pageable pageable);

    @Query("{ 'conversationId': ?0, 'deleted': false, 'content': { $regex: ?1, $options: 'i' } }")
    Page<Message> searchInConversation(String conversationId, String query, Pageable pageable);

    void deleteByConversationId(String conversationId);
}
