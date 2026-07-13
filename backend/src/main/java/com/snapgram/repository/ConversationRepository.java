package com.snapgram.repository;

import com.snapgram.model.Conversation;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ConversationRepository extends MongoRepository<Conversation, String> {

    @Query("{ 'participantIds': { $all: [?0, ?1] }, $expr: { $eq: [ { $size: '$participantIds' }, 2 ] } }")
    Optional<Conversation> findDirectConversation(String userId1, String userId2);

    @Query(value = "{ 'participantIds': ?0, 'deletedByUserIds': { $ne: ?0 } }",
           sort  = "{ 'lastMessageAt': -1 }")
    List<Conversation> findByParticipantIdOrderByLastMessageAtDesc(String userId);
}
