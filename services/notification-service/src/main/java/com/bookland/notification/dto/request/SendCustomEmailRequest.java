package com.bookland.notification.dto.request;

import lombok.*;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SendCustomEmailRequest {
    private List<String> userIds;
    private boolean sendToAll;
    private String subject;
    private String title;
    private String message;
    private String details;
    private String actionUrl;
    private String actionText;
}
