package com.bookland.notification.dto.request;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DirectNotificationRequest {
    private String toUserId;
    private String fromUserId;
    private String type;
    private String title;
    private String content;
}
