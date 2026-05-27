package com.bookland.notification.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "notifications")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {

    @Id
    private String id;

    private String fromUserId;
    private String fromUsername;

    private String toUserId;
    private String toUsername;

    private String type;
    private String title;
    private String content;

    @Builder.Default
    private NotificationStatus status = NotificationStatus.UNREAD;

    private LocalDateTime readAt;
    private LocalDateTime createdAt;

    public enum NotificationStatus {
        UNREAD, READ, ARCHIVED
    }
}
