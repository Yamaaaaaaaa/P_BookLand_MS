package com.bookland.notification.consumer;

import com.bookland.notification.client.UserClient;
import com.bookland.notification.dto.event.EmailEvent;
import com.bookland.notification.dto.event.NotificationEvent;
import com.bookland.notification.service.EmailService;
import com.bookland.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

@Component
@Slf4j
@RequiredArgsConstructor
public class NotificationConsumer {

    private final NotificationService notificationService;
    private final EmailService emailService;
    private final UserClient userClient;

    @KafkaListener(topics = "notification-events", groupId = "notification-group")
    public void consumeNotificationEvent(NotificationEvent event) {
        log.info("Received NotificationEvent via Kafka for user: {}", event.getToUserId());
        try {
            // 1. Create in-app notification & send via WebSockets
            var response = notificationService.createNotification(
                    event.getToUserId(),
                    event.getType(),
                    event.getTitle(),
                    event.getContent(),
                    event.getFromUserId()
            );

            // 2. Send email optionally
            if (event.isSendEmail()) {
                String toEmail = null;
                try {
                    var profileResponse = userClient.getProfile(event.getToUserId());
                    if (profileResponse != null && profileResponse.getResult() != null) {
                        toEmail = profileResponse.getResult().getEmail();
                    }
                } catch (Exception e) {
                    log.error("Failed to fetch user email for notification event from user-service", e);
                }

                if (toEmail != null && !toEmail.isEmpty()) {
                    Map<String, Object> templateModel = event.getEmailTemplateModel();
                    if (templateModel == null) {
                        templateModel = new HashMap<>();
                    }
                    if (!templateModel.containsKey("name")) {
                        templateModel.put("name", response.getToUsername() != null ? response.getToUsername() : "Customer");
                    }
                    if (!templateModel.containsKey("message")) {
                        templateModel.put("message", event.getContent());
                    }

                    String templateName = event.getEmailTemplate() != null && !event.getEmailTemplate().trim().isEmpty()
                            ? event.getEmailTemplate() : "email-template";

                    String subject = event.getEmailSubject() != null && !event.getEmailSubject().trim().isEmpty()
                            ? event.getEmailSubject() : event.getTitle();

                    emailService.sendEmailWithHtmlTemplate(toEmail, subject, templateName, templateModel);
                } else {
                    log.warn("Could not send notification email because email address for user ID {} is empty or unresolved", event.getToUserId());
                }
            }
        } catch (Exception e) {
            log.error("Error processing NotificationEvent", e);
        }
    }

    @KafkaListener(topics = "email-events", groupId = "notification-group")
    public void consumeEmailEvent(EmailEvent event) {
        log.info("Received EmailEvent via Kafka for recipient: {}", event.getTo());
        try {
            if (event.getTemplateName() != null && !event.getTemplateName().trim().isEmpty()) {
                emailService.sendEmailWithHtmlTemplate(
                        event.getTo(),
                        event.getSubject(),
                        event.getTemplateName(),
                        event.getTemplateModel()
                );
            } else {
                emailService.sendPlainEmail(event.getTo(), event.getSubject(), event.getBody());
            }
        } catch (Exception e) {
            log.error("Error processing EmailEvent", e);
        }
    }
}
