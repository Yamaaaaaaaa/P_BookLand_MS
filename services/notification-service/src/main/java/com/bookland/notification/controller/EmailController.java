package com.bookland.notification.controller;

import com.bookland.notification.client.UserClient;
import com.bookland.notification.dto.ApiResponse;
import com.bookland.notification.dto.request.SendCustomEmailRequest;
import com.bookland.notification.dto.request.SendDirectEmailRequest;
import com.bookland.notification.dto.response.UserProfileResponse;
import com.bookland.notification.service.EmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications/email")
@RequiredArgsConstructor
@Slf4j
public class EmailController {

    private final EmailService emailService;
    private final UserClient userClient;

    @PostMapping("/send-custom")
    public ApiResponse<Void> sendCustomEmails(@RequestBody SendCustomEmailRequest request) {
        log.info("Request to send custom emails. sendToAll={}", request.isSendToAll());
        List<UserProfileResponse> users = new ArrayList<>();

        try {
            if (request.isSendToAll()) {
                var response = userClient.getAllUsers();
                if (response != null && response.getResult() != null) {
                    users = response.getResult();
                }
            } else if (request.getUserIds() != null && !request.getUserIds().isEmpty()) {
                for (String userId : request.getUserIds()) {
                    try {
                        var response = userClient.getProfile(userId);
                        if (response != null && response.getResult() != null) {
                            users.add(response.getResult());
                        }
                    } catch (Exception e) {
                        log.error("Failed to fetch user profile for email campaign. userId={}", userId, e);
                    }
                }
            }
        } catch (Exception e) {
            log.error("Error retrieving users for email campaign", e);
            return ApiResponse.<Void>builder()
                    .code(1500)
                    .message("Failed to fetch target users: " + e.getMessage())
                    .build();
        }

        int sentCount = 0;
        for (UserProfileResponse user : users) {
            String email = user.getEmail();
            if (email != null && !email.trim().isEmpty() && email.contains("@")) {
                Map<String, Object> templateModel = new HashMap<>();
                templateModel.put("name", user.getUsername() != null ? user.getUsername() : "Customer");
                templateModel.put("message", request.getMessage() != null ? request.getMessage() : "");

                if (request.getDetails() != null && !request.getDetails().isEmpty()) {
                    templateModel.put("details", request.getDetails());
                }
                if (request.getActionUrl() != null && !request.getActionUrl().isEmpty()) {
                    templateModel.put("actionUrl", request.getActionUrl());
                }
                if (request.getActionText() != null && !request.getActionText().isEmpty()) {
                    templateModel.put("actionText", request.getActionText());
                } else if (request.getActionUrl() != null && !request.getActionUrl().isEmpty()) {
                    templateModel.put("actionText", "Xem Chi Tiết");
                }

                String subject = request.getSubject() != null && !request.getSubject().isEmpty()
                        ? request.getSubject() : "Thông báo từ BookLand";

                emailService.sendEmailWithHtmlTemplate(email, subject, "email-template", templateModel);
                sentCount++;
            }
        }

        log.info("Successfully queued custom emails for {} users.", sentCount);
        return ApiResponse.<Void>builder()
                .message("Emails are being sent to " + sentCount + " user(s).")
                .build();
    }

    @PostMapping("/send-direct")
    public ApiResponse<Void> sendDirectEmail(@RequestBody SendDirectEmailRequest request) {
        log.info("Request to send direct email to={}", request.getTo());
        if (request.getTo() == null || request.getTo().trim().isEmpty() || !request.getTo().contains("@")) {
            return ApiResponse.<Void>builder()
                    .code(1400)
                    .message("Invalid email address")
                    .build();
        }

        if (request.getTemplateName() != null && !request.getTemplateName().trim().isEmpty()) {
            emailService.sendEmailWithHtmlTemplate(
                    request.getTo(),
                    request.getSubject() != null ? request.getSubject() : "Thông báo từ BookLand",
                    request.getTemplateName(),
                    request.getTemplateModel() != null ? request.getTemplateModel() : new HashMap<>()
            );
        } else {
            emailService.sendPlainEmail(
                    request.getTo(),
                    request.getSubject() != null ? request.getSubject() : "Thông báo từ BookLand",
                    request.getBody() != null ? request.getBody() : ""
            );
        }

        return ApiResponse.<Void>builder()
                .message("Email sent successfully to " + request.getTo())
                .build();
    }
}
