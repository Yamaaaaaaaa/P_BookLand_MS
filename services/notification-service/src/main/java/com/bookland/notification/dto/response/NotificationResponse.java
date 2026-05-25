package com.bookland.notification.dto.response;

import com.bookland.notification.entity.Notification.NotificationStatus;
import lombok.*;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationResponse {
    private String id;
    private String fromUserId;
    private String fromUsername;
    private String toUserId;
    private String toUsername;
    private String type;
    private String title;
    private String content;
    private NotificationStatus status;
    private LocalDateTime readAt;
    private LocalDateTime createdAt;
}
