package com.snapgram.repository;

import com.snapgram.model.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * BUG FIX: countByRecipientIdAndIsRead -> countByRecipientIdAndRead (field renamed).
 * BUG FIX: Added findByRecipientIdAndRead() returning List for markAllAsRead fix.
 */
@Repository
public interface NotificationRepository extends MongoRepository<Notification, String> {

    Page<Notification> findByRecipientIdOrderByCreatedAtDesc(String recipientId, Pageable pageable);

    // FIX: field "isRead" renamed to "read" — Spring Data derives query from field name
    long countByRecipientIdAndRead(String recipientId, boolean read);

    // FIX: Added List variant to avoid Integer.MAX_VALUE pagination bug
    List<Notification> findByRecipientIdAndRead(String recipientId, boolean read);

    void deleteByRecipientId(String recipientId);

    void deleteByEntityIdAndTypeAndActorId(String entityId, Notification.NotificationType type, String actorId);
}
