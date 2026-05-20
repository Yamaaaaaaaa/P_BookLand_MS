# 08 — Notification Service

> Xử lý mọi loại thông báo: Email, WebSocket push, và Chat.

---

## 1. Tổng quan

**Port**: `8086` | **Database**: `MongoDB (notification_db)` | **Kafka**: Consumer

Đây là service **pure consumer** — không gọi API của service nào, chỉ nhận Kafka events và xử lý.

---

## 2. Tại sao MongoDB?

- Notification có schema linh hoạt (payload khác nhau theo loại)
- Không cần ACID transaction phức tạp
- Read-heavy (user đọc notification danh sách)
- Dễ TTL (tự xóa notification cũ sau 30 ngày)

---

## 3. MongoDB Collections

```json
// Collection: notifications
{
  "_id": "ObjectId",
  "userId": "42",
  "type": "ORDER_CREATED | ORDER_STATUS_UPDATED | PAYMENT_DONE | SYSTEM",
  "title": "Đơn hàng đã được xác nhận",
  "message": "Đơn hàng #123 trị giá 250,000đ đã được xác nhận.",
  "referenceId": "123",        // orderId, bookId, ...
  "referenceType": "ORDER",
  "read": false,
  "createdAt": "ISODate",
  "expireAt": "ISODate"        // TTL index: tự xóa sau 30 ngày
}

// Collection: chat_messages
{
  "_id": "ObjectId",
  "senderId": "42",
  "senderName": "Nguyễn Văn A",
  "senderAvatar": "https://...",
  "receiverId": "1",           // Admin ID
  "content": "Tôi chưa nhận được hàng",
  "type": "TEXT | IMAGE",
  "sentAt": "ISODate",
  "read": false
}
```

---

## 4. Kafka Consumers

```java
@KafkaListener(topics = "order.created", groupId = "notification-service")
public void onOrderCreated(OrderCreatedEvent event) {
    // 1. Gửi email xác nhận (Thymeleaf template)
    emailService.sendOrderConfirmation(event.getUserEmail(), event);

    // 2. Lưu notification
    saveNotification(event.getUserId(), "ORDER_CREATED",
        "Đặt hàng thành công!", 
        "Đơn hàng #" + event.getOrderId() + " đã được xác nhận.",
        event.getOrderId(), "ORDER");

    // 3. Push WebSocket
    wsService.sendToUser(event.getUserId(), buildPushPayload(event));
}

@KafkaListener(topics = "order.status.updated", groupId = "notification-service")
public void onOrderStatusUpdated(OrderStatusUpdatedEvent event) {
    String message = buildStatusMessage(event.getNewStatus(), event.getOrderId());
    emailService.sendStatusUpdate(event.getUserEmail(), event);
    saveAndPush(event.getUserId(), "ORDER_STATUS_UPDATED", message, event.getOrderId());
}

@KafkaListener(topics = "user.registered", groupId = "notification-service")
public void onUserRegistered(UserRegisteredEvent event) {
    emailService.sendWelcomeEmail(event.getEmail(), event.getFullName());
}
```

---

## 5. WebSocket (STOMP)

```java
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic", "/queue");
        config.setApplicationDestinationPrefixes("/app");
        config.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
            .setAllowedOrigins("http://localhost:5173", "https://bookland.app")
            .withSockJS();
    }
}
```

```java
// Gửi notification đến user cụ thể
messagingTemplate.convertAndSendToUser(
    userId,
    "/queue/notifications",
    notification
);

// Broadcast toàn hệ thống (System announcement)
messagingTemplate.convertAndSend("/topic/broadcast", announcement);
```

---

## 6. API Endpoints

```
GET  /api/notifications          ← Danh sách notification của tôi
     ?page=0&size=20&read=false

PUT  /api/notifications/{id}/read    ← Đánh dấu đã đọc 1 thông báo
PUT  /api/notifications/read-all     ← Đánh dấu đọc tất cả
GET  /api/notifications/unread-count ← Số thông báo chưa đọc

GET  /api/chat/messages          ← Lịch sử chat với admin
POST /api/chat/messages          ← Gửi tin nhắn mới (qua HTTP, sync về DB)
```

---

## 7. Email Templates (Thymeleaf)

```
templates/
├── order-confirmation.html     ← Email xác nhận đơn hàng
├── order-status-update.html    ← Email cập nhật trạng thái
├── payment-success.html        ← Email thanh toán thành công
├── welcome.html                ← Email chào mừng đăng ký
└── otp.html                    ← Email OTP (tương lai)
```

---

*← [07 - Order Service](./07-order-service.md) | [09 - Event Service →](./09-event-service.md)*
