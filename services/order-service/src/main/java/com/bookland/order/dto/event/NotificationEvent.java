package com.bookland.order.dto.event;

import lombok.*;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationEvent {
    private String toUserId;              // Recipient email/userId
    private String toUsername;            // Recipient name
    private String fromUserId;            // Sender email/userId
    private String fromUsername;          // Sender name
    private String type;                  // Notification type (e.g., "ORDER", "BILL")
    private String title;                 // Title
    private String content;               // Content body

    private boolean sendEmail;            
    private String emailSubject;          
    private String emailTemplate;         
    private Map<String, Object> emailTemplateModel; 
}
