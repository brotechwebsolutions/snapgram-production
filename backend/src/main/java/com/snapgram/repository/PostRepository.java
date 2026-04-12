package com.snapgram.repository;

import com.snapgram.model.Post;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * BUG FIX: "isPinned" field renamed to "pinned" in Post model.
 * @Query annotations updated accordingly.
 */
@Repository
public interface PostRepository extends MongoRepository<Post, String> {

    @Query("{ 'userId': ?0, 'status': 'PUBLISHED' }")
    Page<Post> findPublishedByUserId(String userId, Pageable pageable);

    @Query("{ 'userId': { $in: ?0 }, 'status': 'PUBLISHED' }")
    Page<Post> findFeedByUserIds(List<String> userIds, Pageable pageable);

    @Query("{ 'status': 'PUBLISHED' }")
    Page<Post> findAllPublished(Pageable pageable);

    @Query("{ 'hashtags': ?0, 'status': 'PUBLISHED' }")
    Page<Post> findByHashtag(String hashtag, Pageable pageable);

    @Query("{ 'userId': ?0, 'status': 'ARCHIVED' }")
    Page<Post> findArchivedByUserId(String userId, Pageable pageable);

    @Query("{ 'userId': ?0, 'status': 'DRAFT' }")
    List<Post> findDraftsByUserId(String userId);

    // FIX: was "isPinned" -> now "pinned"
    @Query("{ 'userId': ?0, 'pinned': true, 'status': 'PUBLISHED' }")
    List<Post> findPinnedByUserId(String userId);

    @Query("{ 'mentionedUserIds': ?0, 'status': 'PUBLISHED' }")
    Page<Post> findByMention(String userId, Pageable pageable);

    long countByUserIdAndStatus(String userId, Post.PostStatus status);

    // For trending hashtags
    @Query(value = "{ 'status': 'PUBLISHED' }", fields = "{ 'hashtags': 1 }")
    List<Post> findAllHashtags(Pageable pageable);
}
