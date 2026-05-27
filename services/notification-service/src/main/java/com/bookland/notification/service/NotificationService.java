package com.bookland.notification.service;

import com.bookland.notification.client.UserClient;
import com.bookland.notification.dto.response.NotificationResponse;
import com.bookland.notification.entity.Notification;
import com.bookland.notification.entity.Notification.NotificationStatus;
import com.bookland.notification.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final MongoTemplate mongoTemplate;
    private final SimpMessagingTemplate messagingTemplate;
    private final UserClient userClient;

    public Page<NotificationResponse> getNotifications(String userId, Pageable pageable) {
        return notificationRepository.findByToUserIdOrderByCreatedAtDesc(userId, pageable)
                .map(this::convertToResponse);
    }

    public long countUnread(String userId) {
        return notificationRepository.countByToUserIdAndStatus(userId, NotificationStatus.UNREAD);
    }

    public void markAsRead(String id) {
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy thông báo: " + id));
        notification.setStatus(NotificationStatus.READ);
        notification.setReadAt(LocalDateTime.now());
        notificationRepository.save(notification);
    }

    public void markAllAsRead(String userId) {
        Query query = new Query(Criteria.where("toUserId").is(userId).and("status").is(NotificationStatus.UNREAD));
        Update update = new Update().set("status", NotificationStatus.READ).set("readAt", LocalDateTime.now());
        mongoTemplate.updateMulti(query, update, Notification.class);
    }

    public void deleteNotification(String id) {
        notificationRepository.deleteById(id);
    }

    public void deleteAllRead(String userId) {
        Query query = new Query(Criteria.where("toUserId").is(userId).and("status").is(NotificationStatus.READ));
        mongoTemplate.remove(query, Notification.class);
    }

    public NotificationResponse createNotification(String toUserId, String type, String title, String content, String fromUserId) {
        // Fetch toUser details from user-service
        String toUsername = "Customer";
        String toUserEmail = null;
        try {
            var toProfileResponse = userClient.getProfile(toUserId);
            if (toProfileResponse != null && toProfileResponse.getResult() != null) {
                toUserEmail = toProfileResponse.getResult().getEmail();
                toUsername = toProfileResponse.getResult().getUsername();
            }
        } catch (Exception e) {
            log.warn("Failed to fetch toUser profile for ID: {} from user-service", toUserId, e);
        }

        // Fetch fromUser details from user-service if fromUserId is present
        String fromUsername = null;
        if (fromUserId != null && !fromUserId.trim().isEmpty()) {
            try {
                var fromProfileResponse = userClient.getProfile(fromUserId);
                if (fromProfileResponse != null && fromProfileResponse.getResult() != null) {
                    fromUsername = fromProfileResponse.getResult().getUsername();
                }
            } catch (Exception e) {
                log.warn("Failed to fetch fromUser profile for ID: {} from user-service", fromUserId, e);
            }
        }

        Notification notification = Notification.builder()
                .toUserId(toUserId)
                .toUsername(toUsername)
                .fromUserId(fromUserId)
                .fromUsername(fromUsername)
                .type(type)
                .title(title)
                .content(content)
                .status(NotificationStatus.UNREAD)
                .createdAt(LocalDateTime.now())
                .build();

        Notification saved = notificationRepository.save(notification);
        NotificationResponse response = convertToResponse(saved);

        // Send WebSocket notification
        String destinationUser = (toUserEmail != null) ? toUserEmail : toUserId;
        log.info("Sending WebSocket notification to user: {} (email/id: {})", toUsername, destinationUser);
        try {
            messagingTemplate.convertAndSendToUser(
                    destinationUser,
                    "/queue/notifications",
                    response
            );
        } catch (Exception e) {
            log.error("Failed to send WebSocket notification", e);
        }

        return response;
    }

    private NotificationResponse convertToResponse(Notification notification) {
        return NotificationResponse.builder()
                .id(notification.getId())
                .fromUserId(notification.getFromUserId())
                .fromUsername(notification.getFromUsername())
                .toUserId(notification.getToUserId())
                .toUsername(notification.getToUsername())
                .type(notification.getType())
                .title(notification.getTitle())
                .content(notification.getContent())
                .status(notification.getStatus())
                .readAt(notification.getReadAt())
                .createdAt(notification.getCreatedAt())
                .build();
    }
}
