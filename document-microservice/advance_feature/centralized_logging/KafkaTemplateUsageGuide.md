# Hướng dẫn Tích hợp gửi Notification & Email qua Kafka

Tài liệu này hướng dẫn cách các Service khác (như `book-service`, `order-service`, `identity-service`,...) cấu hình và sử dụng Kafka để gửi thông báo (In-app Notification) và Email thông qua `notification-service`.

---

## 1. Cấu hình Maven Dependencies
Thêm dependency `spring-kafka` vào `pom.xml` của service cần gửi tin nhắn:

```xml
<dependency>
    <groupId>org.springframework.kafka</groupId>
    <artifactId>spring-kafka</artifactId>
</dependency>
```

---

## 2. Cấu hình `application.yml`
Thêm cấu hình Kafka Producer để định dạng dữ liệu gửi đi dưới dạng JSON:

```yaml
spring:
  kafka:
    bootstrap-servers: ${SPRING_KAFKA_BOOTSTRAP_SERVERS:localhost:9092}
    producer:
      key-serializer: org.apache.kafka.common.serialization.StringSerializer
      value-serializer: org.springframework.kafka.support.serializer.JsonSerializer
```

---

## 3. Định nghĩa DTOs trong Service của bạn
Tạo các lớp DTO để chứa dữ liệu truyền đi (phải khớp cấu trúc JSON mà `notification-service` mong đợi).

### 3.1. DTO gửi In-app Notification (và tùy chọn tự động gửi kèm Email)
```java
package com.bookland.your_service.dto.event;

import lombok.*;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationEvent {
    private String toUserId;              // ID người nhận (bắt buộc)
    private String toUsername;            // Tên người nhận (tùy chọn)
    private String fromUserId;            // ID người gửi (tùy chọn)
    private String fromUsername;          // Tên người gửi (tùy chọn)
    private String type;                  // Loại thông báo (e.g. "ORDER", "CHAT", "SYSTEM")
    private String title;                 // Tiêu đề thông báo
    private String content;               // Nội dung thông báo

    // Tùy chọn tự động gửi kèm Email cùng với Notification này
    private boolean sendEmail;            
    private String emailSubject;          // Tiêu đề email (nếu trống sẽ dùng 'title')
    private String emailTemplate;         // Template email (mặc định là 'email-template')
    private Map<String, Object> emailTemplateModel; // Biến truyền vào template (e.g. name, message, details, actionUrl)
}
```

### 3.2. DTO gửi Email trực tiếp
```java
package com.bookland.your_service.dto.event;

import lombok.*;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmailEvent {
    private String to;                    // Email người nhận (bắt buộc)
    private String subject;               // Tiêu đề email
    private String templateName;          // Tên HTML template (e.g. "email-template")
    private Map<String, Object> templateModel; // Biến truyền vào HTML template (e.g. name, message, details, actionUrl, actionText)
    private String body;                  // Nội dung text/html thường (nếu không dùng templateName)
}
```

---

## 4. Viết Service gửi Message (Producer)
Tạo class `NotificationProducer` để thực hiện gửi Event vào Kafka topic tương ứng:

```java
package com.bookland.your_service.producer;

import com.bookland.your_service.dto.event.EmailEvent;
import com.bookland.your_service.dto.event.NotificationEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationProducer {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    // Gửi In-app Notification (và tùy chọn tự động gửi kèm Email)
    public void sendNotification(NotificationEvent event) {
        log.info("Publishing NotificationEvent to Kafka for user: {}", event.getToUserId());
        kafkaTemplate.send("notification-events", event);
    }

    // Gửi Email trực tiếp
    public void sendEmail(EmailEvent event) {
        log.info("Publishing EmailEvent to Kafka for email: {}", event.getTo());
        kafkaTemplate.send("email-events", event);
    }
}
```

---

## 5. Ví dụ sử dụng thực tế (e.g. Trong Order Service khi mua hàng thành công)

```java
@Autowired
private NotificationProducer notificationProducer;

public void completeOrder(Order order) {
    // 1. Lưu DB đơn hàng...
    
    // 2. Gửi In-app Notification và Email xác nhận đơn hàng đồng thời:
    java.util.Map<String, Object> emailModel = new java.util.HashMap<>();
    emailModel.put("details", "Mã đơn hàng của bạn là: " + order.getId() + ". Tổng tiền: " + order.getTotalPrice() + " VNĐ.");
    emailModel.put("actionUrl", "http://localhost:3000/orders/" + order.getId());
    emailModel.put("actionText", "Theo Dõi Đơn Hàng");

    NotificationEvent notificationEvent = NotificationEvent.builder()
            .toUserId(order.getUserId())
            .type("ORDER")
            .title("Đặt hàng thành công!")
            .content("Cảm ơn bạn đã mua sắm tại BookLand. Đơn hàng #" + order.getId() + " đang được xử lý.")
            .sendEmail(true) // Kích hoạt tự động gửi Email kèm theo
            .emailSubject("Xác nhận đơn hàng #" + order.getId() + " - BookLand")
            .emailTemplateModel(emailModel)
            .build();

    notificationProducer.sendNotification(notificationEvent);
}
```
