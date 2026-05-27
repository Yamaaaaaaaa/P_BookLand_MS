package com.bookland.notification.controller;

import com.bookland.notification.dto.ApiResponse;
import com.bookland.notification.dto.request.DirectNotificationRequest;
import com.bookland.notification.dto.response.NotificationResponse;
import com.bookland.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping("/user/{userId}")
    public ApiResponse<Page<NotificationResponse>> getNotifications(
            @PathVariable String userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size);
        return ApiResponse.<Page<NotificationResponse>>builder()
                .result(notificationService.getNotifications(userId, pageable))
                .build();
    }

    @GetMapping("/user/{userId}/unread-count")
    public ApiResponse<Long> getUnreadCount(@PathVariable String userId) {
        return ApiResponse.<Long>builder()
                .result(notificationService.countUnread(userId))
                .build();
    }

    @PutMapping("/{id}/read")
    public ApiResponse<Void> markAsRead(@PathVariable String id) {
        notificationService.markAsRead(id);
        return ApiResponse.<Void>builder().message("Marked as read").build();
    }

    @PutMapping("/user/{userId}/read-all")
    public ApiResponse<Void> markAllAsRead(@PathVariable String userId) {
        notificationService.markAllAsRead(userId);
        return ApiResponse.<Void>builder().message("All marked as read").build();
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> deleteNotification(@PathVariable String id) {
        notificationService.deleteNotification(id);
        return ApiResponse.<Void>builder().message("Notification deleted").build();
    }

    @DeleteMapping("/user/{userId}/read")
    public ApiResponse<Void> deleteAllReadNotifications(@PathVariable String userId) {
        notificationService.deleteAllRead(userId);
        return ApiResponse.<Void>builder().message("All read notifications deleted").build();
    }

    @PostMapping("/send")
    public ApiResponse<NotificationResponse> sendDirectNotification(@RequestBody DirectNotificationRequest request) {
        NotificationResponse response = notificationService.createNotification(
                request.getToUserId(),
                request.getType(),
                request.getTitle(),
                request.getContent(),
                request.getFromUserId()
        );
        return ApiResponse.<NotificationResponse>builder()
                .result(response)
                .message("Notification sent successfully")
                .build();
    }
}
