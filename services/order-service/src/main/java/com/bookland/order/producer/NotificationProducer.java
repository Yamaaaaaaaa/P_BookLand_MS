package com.bookland.order.producer;

import com.bookland.order.dto.event.NotificationEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationProducer {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    public void sendNotification(NotificationEvent event) {
        try {
            log.info("Publishing NotificationEvent to Kafka for user: {}", event.getToUserId());
            kafkaTemplate.send("notification-events", event);
        } catch (Exception e) {
            log.error("Failed to publish NotificationEvent to Kafka: {}", e.getMessage(), e);
        }
    }
}
