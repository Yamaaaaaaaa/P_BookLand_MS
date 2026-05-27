package com.bookland.chat.controller;

import com.bookland.chat.dto.request.SendChatMessageRequest;
import com.bookland.chat.dto.response.ApiResponse;
import com.bookland.chat.dto.response.ChatMessageResponse;
import com.bookland.chat.dto.response.ConversationUserResponse;
import com.bookland.chat.service.ChatMessageService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping({"/api/chat", "/chat"})
@RequiredArgsConstructor
@Slf4j
@SecurityRequirement(name = "BearerAuth")
public class ChatMessageController {

    private final ChatMessageService chatMessageService;

    @GetMapping("/history/{otherUserId}")
    public ApiResponse<List<ChatMessageResponse>> getChatHistory(
            @RequestHeader("X-User-Id") Long currentUserId,
            @PathVariable Long otherUserId
    ) {
        log.info("GET /api/chat/history/{} by userId={}", otherUserId, currentUserId);
        return ApiResponse.<List<ChatMessageResponse>>builder()
                .result(chatMessageService.getChatHistory(currentUserId, otherUserId))
                .build();
    }

    @GetMapping("/conversations")
    public ApiResponse<List<ConversationUserResponse>> getConversations(
            @RequestHeader("X-User-Id") Long currentUserId
    ) {
        log.info("GET /api/chat/conversations by adminId={}", currentUserId);
        return ApiResponse.<List<ConversationUserResponse>>builder()
                .result(chatMessageService.getConversations(currentUserId))
                .build();
    }

    @PostMapping("/send")
    public ApiResponse<ChatMessageResponse> sendMessage(
            @RequestHeader("X-User-Id") Long currentUserId,
            @RequestBody SendChatMessageRequest request
    ) {
        log.info("POST /api/chat/send by userId={}, toEmail={}", currentUserId, request.getToEmail());
        return ApiResponse.<ChatMessageResponse>builder()
                .result(chatMessageService.sendMessage(currentUserId, request))
                .build();
    }

    @PutMapping("/mark-read/{otherUserId}")
    public ApiResponse<Void> markAsRead(
            @RequestHeader("X-User-Id") Long currentUserId,
            @PathVariable Long otherUserId
    ) {
        log.info("PUT /api/chat/mark-read/{} by userId={}", otherUserId, currentUserId);
        chatMessageService.markAsRead(currentUserId, otherUserId);
        return ApiResponse.<Void>builder()
                .message("Messages marked as read")
                .build();
    }

    @GetMapping("/unread-count")
    public ApiResponse<Long> getUnreadCount(
            @RequestHeader("X-User-Id") Long currentUserId
    ) {
        log.info("GET /api/chat/unread-count by userId={}", currentUserId);
        return ApiResponse.<Long>builder()
                .result(chatMessageService.getUnreadCount(currentUserId))
                .build();
    }
}
