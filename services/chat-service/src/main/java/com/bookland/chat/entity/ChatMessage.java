package com.bookland.chat.entity;

import lombok.*;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "chat_message")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "from_user_id", nullable = true)
    private Long fromUserId;

    @Column(name = "to_user_id", nullable = true)
    private Long toUserId;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    @Column(nullable = false)
    @Builder.Default
    private Boolean isRead = false;

    @Column(updatable = false)
    private LocalDateTime createdAt;

    // Chatbot fields
    @Column(name = "session_id", length = 36)
    private String sessionId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private MessageRole role = MessageRole.USER;

    @Enumerated(EnumType.STRING)
    @Column(name = "content_type", nullable = false)
    @Builder.Default
    private ContentType contentType = ContentType.TEXT;

    @Column(name = "ai_confidence")
    private Double aiConfidence;

    @Column(columnDefinition = "JSON")
    private String metadata;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public enum MessageRole {
        USER,       // Client sends
        ASSISTANT,  // Bot reply
        ADMIN,      // Admin sends (in escalated chats)
        SYSTEM      // System notices (e.g. "Admin X joined")
    }

    public enum ContentType {
        TEXT,           // Plain text
        PRODUCT_CARD,   // Product recommendations
        QUICK_REPLY,    // Quick reply suggestions
        SYSTEM_NOTICE   // System notices
    }
}
