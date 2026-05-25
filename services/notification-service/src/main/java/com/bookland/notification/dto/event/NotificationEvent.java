package com.bookland.notification.dto.event;

import lombok.*;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationEvent {
    private String toUserId;
    private String toUsername;
    private String fromUserId;
    private String fromUsername;
    private String type;
    private String title;
    private String content;
    
    // Optional automatic email dispatch matching this notification
    private boolean sendEmail;
    private String emailSubject;
    private String emailTemplate;
    private Map<String, Object> emailTemplateModel;
}
