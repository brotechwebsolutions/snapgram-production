package com.snapgram.repository;

import com.snapgram.model.Comment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

/**
 * BUG FIX: "isDeleted" field renamed to "deleted" in Comment model.
 * Spring Data query derivation uses the actual field name.
 * @Query annotations updated to use "deleted" field name.
 */
@Repository
public interface CommentRepository extends MongoRepository<Comment, String> {

    // FIX: was "isDeleted" -> now "deleted" in document
    @Query("{ 'postId': ?0, 'parentCommentId': null, 'deleted': false }")
    Page<Comment> findTopLevelByPostId(String postId, Pageable pageable);

    @Query("{ 'parentCommentId': ?0, 'deleted': false }")
    Page<Comment> findRepliesByParentId(String parentCommentId, Pageable pageable);

    // FIX: Spring Data method name uses renamed field "deleted"
    long countByPostIdAndDeleted(String postId, boolean deleted);

    void deleteByPostId(String postId);
}
