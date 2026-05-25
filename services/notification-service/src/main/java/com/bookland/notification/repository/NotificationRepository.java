package com.bookland.notification.repository;

import com.bookland.notification.entity.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends MongoRepository<Notification, String> {

    Page<Notification> findByToUserIdOrderByCreatedAtDesc(String toUserId, Pageable pageable);

    List<Notification> findByToUserIdOrderByCreatedAtDesc(String toUserId);

    List<Notification> findByToUserIdAndStatus(String toUserId, Notification.NotificationStatus status);

    Page<Notification> findByToUserIdAndStatusOrderByCreatedAtDesc(String toUserId,
                                                                   Notification.NotificationStatus status,
                                                                   Pageable pageable);

    long countByToUserIdAndStatus(String toUserId, Notification.NotificationStatus status);
}
