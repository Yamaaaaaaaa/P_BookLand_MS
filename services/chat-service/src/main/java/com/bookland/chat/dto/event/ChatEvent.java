package com.bookland.chat.dto.event;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ChatEvent {
    Long id;
    Long fromUserId;
    String fromUsername;
    String fromEmail;
    Long toUserId;
    String toUsername;
    String toEmail;
    String content;
    Boolean isRead;
    LocalDateTime createdAt;

    // Chatbot fields
    String sessionId;
    String role;
    String contentType;
    Double aiConfidence;
    String metadata;
}
