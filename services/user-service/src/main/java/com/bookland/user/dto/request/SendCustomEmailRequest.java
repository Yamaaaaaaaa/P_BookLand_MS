package com.bookland.user.dto.request;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class SendCustomEmailRequest {
    List<Long> userIds;
    boolean sendToAll;
    String subject;
    String title;
    String message;
    String details;
    String actionUrl;
    String actionText;
}
