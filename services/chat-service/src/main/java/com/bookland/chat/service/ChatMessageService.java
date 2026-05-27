package com.bookland.chat.service;

import com.bookland.chat.client.UserClient;
import com.bookland.chat.dto.event.ChatEvent;
import com.bookland.chat.dto.request.SendChatMessageRequest;
import com.bookland.chat.dto.response.ChatMessageResponse;
import com.bookland.chat.dto.response.ConversationUserResponse;
import com.bookland.chat.dto.response.UserProfileResponse;
import com.bookland.chat.entity.ChatMessage;
import com.bookland.chat.exception.AppException;
import com.bookland.chat.exception.ErrorCode;
import com.bookland.chat.repository.ChatMessageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ChatMessageService {

    private final ChatMessageRepository chatMessageRepository;
    private final UserClient userClient;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional(readOnly = true)
    public List<ChatMessageResponse> getChatHistory(Long currentUserId, Long otherUserId) {
        // Fetch profiles via Feign client
        UserProfileResponse currentUser = getProfileSafely(currentUserId);
        UserProfileResponse otherUser = getProfileSafely(otherUserId);

        return chatMessageRepository.findChatHistory(currentUserId, otherUserId)
                .stream()
                .map(msg -> convertToResponse(msg, currentUser, otherUser))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ConversationUserResponse> getConversations(Long adminId) {
        List<Long> userIds = chatMessageRepository.findConversationUserIds(adminId);
        List<ConversationUserResponse> conversations = new ArrayList<>();

        for (Long userId : userIds) {
            UserProfileResponse user = getProfileSafely(userId);
            if (user != null) {
                Long unreadCount = chatMessageRepository.countUnreadMessagesBetween(userId, adminId);
                
                List<ChatMessage> history = chatMessageRepository.findChatHistory(adminId, userId);
                ChatMessageResponse lastMessage = null;
                if (!history.isEmpty()) {
                    ChatMessage lastMsgEntity = history.get(history.size() - 1);
                    UserProfileResponse fromUser = lastMsgEntity.getFromUserId().equals(adminId) ? getProfileSafely(adminId) : user;
                    UserProfileResponse toUser = lastMsgEntity.getToUserId().equals(adminId) ? getProfileSafely(adminId) : user;
                    lastMessage = convertToResponse(lastMsgEntity, fromUser, toUser);
                }

                conversations.add(ConversationUserResponse.builder()
                        .userId(user.getId())
                        .username(user.getUsername())
                        .email(user.getEmail())
                        .unreadCount(unreadCount)
                        .lastMessage(lastMessage)
                        .build());
            }
        }

        return conversations;
    }

    @Transactional
    public ChatMessageResponse sendMessage(Long fromUserId, SendChatMessageRequest request) {
        // 1. Fetch fromUser profile
        UserProfileResponse fromUser = getProfileSafely(fromUserId);
        if (fromUser == null) {
            throw new AppException(ErrorCode.USER_NOT_EXISTED);
        }

        // 2. Fetch toUser profile by Email
        UserProfileResponse toUser = null;
        try {
            var response = userClient.getProfileByEmail(request.getToEmail());
            if (response != null) {
                toUser = response.getResult();
            }
        } catch (Exception e) {
            log.error("Failed to query target user profile by email via Feign client", e);
        }

        if (toUser == null) {
            throw new AppException(ErrorCode.USER_NOT_EXISTED);
        }

        // 3. Save ChatMessage entity
        ChatMessage chatMessage = ChatMessage.builder()
                .fromUserId(fromUser.getId())
                .toUserId(toUser.getId())
                .content(request.getContent())
                .isRead(false)
                .build();

        ChatMessage saved = chatMessageRepository.save(chatMessage);
        ChatMessageResponse response = convertToResponse(saved, fromUser, toUser);

        // 4. Push chat message trực tiếp qua WebSocket của chat-service
        log.info("Pushing ChatMessage via WebSocket (chat-service) from {} to {}", fromUser.getEmail(), toUser.getEmail());
        try {
            // Gửi đến người nhận (toUser)
            messagingTemplate.convertAndSendToUser(
                    toUser.getEmail(),
                    "/queue/chat",
                    response
            );
            // Gửi về cho người gửi (fromUser) để hiển thị tin nhắn của chính họ
            messagingTemplate.convertAndSendToUser(
                    fromUser.getEmail(),
                    "/queue/chat",
                    response
            );
            log.info("Chat message pushed via WebSocket to {} and {}", toUser.getEmail(), fromUser.getEmail());
        } catch (Exception e) {
            log.error("Failed to push chat message via WebSocket", e);
        }

        return response;
    }

    @Transactional
    public void markAsRead(Long currentUserId, Long otherUserId) {
        List<ChatMessage> messages = chatMessageRepository.findChatHistory(currentUserId, otherUserId);
        messages.stream()
                .filter(msg -> msg.getToUserId().equals(currentUserId) && !msg.getIsRead())
                .forEach(msg -> msg.setIsRead(true));
        chatMessageRepository.saveAll(messages);
    }

    @Transactional(readOnly = true)
    public Long getUnreadCount(Long userId) {
        return chatMessageRepository.countUnreadMessages(userId);
    }

    private UserProfileResponse getProfileSafely(Long userId) {
        try {
            var response = userClient.getProfile(userId);
            if (response != null && response.getResult() != null) {
                return response.getResult();
            }
        } catch (Exception e) {
            log.error("Failed to fetch user profile for ID {} via Feign client", userId, e);
        }
        return UserProfileResponse.builder()
                .id(userId)
                .username("User_" + userId)
                .email("user" + userId + "@bookland.com")
                .build();
    }

    private ChatMessageResponse convertToResponse(ChatMessage message, UserProfileResponse fromUser, UserProfileResponse toUser) {
        return ChatMessageResponse.builder()
                .id(message.getId())
                .fromUserId(message.getFromUserId())
                .fromUsername(fromUser != null ? fromUser.getUsername() : "User_" + message.getFromUserId())
                .fromEmail(fromUser != null ? fromUser.getEmail() : "")
                .toUserId(message.getToUserId())
                .toUsername(toUser != null ? toUser.getUsername() : "User_" + message.getToUserId())
                .toEmail(toUser != null ? toUser.getEmail() : "")
                .content(message.getContent())
                .isRead(message.getIsRead())
                .createdAt(message.getCreatedAt())
                .sessionId(message.getSessionId())
                .role(message.getRole() != null ? message.getRole().name() : null)
                .contentType(message.getContentType() != null ? message.getContentType().name() : null)
                .aiConfidence(message.getAiConfidence())
                .metadata(message.getMetadata())
                .build();
    }
}
