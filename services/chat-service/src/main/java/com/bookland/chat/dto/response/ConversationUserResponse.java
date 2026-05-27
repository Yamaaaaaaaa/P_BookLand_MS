package com.bookland.chat.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ConversationUserResponse {
    Long userId;
    String username;
    String email;
    Long unreadCount;
    ChatMessageResponse lastMessage;
}
