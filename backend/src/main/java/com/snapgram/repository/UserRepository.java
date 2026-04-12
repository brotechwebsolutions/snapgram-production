package com.snapgram.repository;

import com.snapgram.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends MongoRepository<User, String> {

    Optional<User> findByEmail(String email);
    Optional<User> findByUsername(String username);
    boolean existsByEmail(String email);
    boolean existsByUsername(String username);

    // Token-based lookups
    Optional<User> findByEmailVerificationToken(String token);
    Optional<User> findByPasswordResetToken(String token);

    // Search users by username or full name (case-insensitive)
    @Query("{ $or: [ { 'username': { $regex: ?0, $options: 'i' } }, { 'fullName': { $regex: ?0, $options: 'i' } } ] }")
    Page<User> searchUsers(String query, Pageable pageable);

    // Social graph queries
    // Find users who have userId in their followingIds (= followers of userId)
    @Query("{ 'followingIds': ?0 }")
    Page<User> findFollowers(String userId, Pageable pageable);

    // Find users who have userId in their followerIds (= who userId follows)
    @Query("{ 'followerIds': ?0 }")
    Page<User> findFollowing(String userId, Pageable pageable);

    // Find unverified users (for cleanup / analytics)
    @Query("{ 'emailVerified': false }")
    List<User> findUnverifiedUsers();

    // Find locked accounts (for admin / cleanup)
    @Query("{ 'accountLocked': true }")
    List<User> findLockedAccounts();
}
