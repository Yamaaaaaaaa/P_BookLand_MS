# 05 — Chat Service & WebSocket Architecture (Tách riêng luồng Chat)

> Tài liệu này mô tả **Chat Service** và kiến trúc **WebSocket tách biệt** giữa Chat và Notification — được implement trong đợt phát triển tháng 05/2026.

---

## 1. Bối cảnh & Lý do tách

### Trạng thái ban đầu (trước khi tách)

Hệ thống ban đầu dùng **chung 1 WebSocket endpoint `/ws`** cho cả Notification và Chat:

```
Frontend
  └── WebSocketContext → /ws (notification-service:8086)
                              ├── /queue/notifications  ← Thông báo hệ thống
                              └── /queue/chat           ← Tin nhắn chat (qua Kafka)

Luồng gửi chat cũ:
  User gửi HTTP POST /api/chat/send
    → chat-service save DB
    → publish Kafka topic "chat-events"
      → notification-service consume
        → push WS /queue/chat đến người nhận
```

### Vấn đề

- Chat và Notification **phụ thuộc lẫn nhau** — notification-service phải biết về chat
- Latency cao hơn do đi qua Kafka (HTTP → DB → Kafka → WS)
- Khó scale riêng lẻ từng tính năng
- Nếu notification-service lỗi → chat cũng bị ảnh hưởng

### Kiến trúc mới (sau khi tách)

```
Frontend
  ├── WebSocketContext     → /ws      (notification-service:8086)
  │     └── /queue/notifications     ← Thông báo hệ thống, order, ...
  │
  └── ChatWebSocketContext → /chat-ws (chat-service:8089)
        └── /user/queue/chat         ← Tin nhắn chat realtime

Luồng gửi chat mới:
  User gửi HTTP POST /api/chat/send
    → chat-service save DB
    → push WS trực tiếp qua SimpMessagingTemplate
      → /user/queue/chat đến fromUser & toUser
```

---

## 2. Chat Service

### 2.1 Tổng quan

| Thuộc tính | Giá trị |
|---|---|
| **Port** | `8089` |
| **Database** | MySQL (`chat_db`) |
| **WebSocket Endpoint** | `/chat-ws` (SockJS) |
| **Kafka** | Producer (dự phòng, không còn dùng cho WS push) |

### 2.2 Cấu trúc project

```text
chat-service/
├── pom.xml                          ← spring-boot-starter-websocket (thêm mới)
└── src/main/java/com/bookland/chat/
    ├── ChatServiceApplication.java
    ├── config/
    │   ├── WebSocketConfig.java     ← [MỚI] STOMP broker, endpoint /chat-ws
    │   ├── SecurityConfig.java      ← Permit all (Gateway xác thực)
    │   └── SwaggerConfig.java
    ├── controller/
    │   └── ChatMessageController.java   ← REST: history, send, conversations
    ├── service/
    │   └── ChatMessageService.java      ← [CẬP NHẬT] push WS trực tiếp
    ├── entity/
    │   └── ChatMessage.java
    ├── repository/
    │   └── ChatMessageRepository.java
    ├── client/
    │   └── UserClient.java              ← Feign → user-service
    └── dto/
        ├── request/SendChatMessageRequest.java
        ├── response/ChatMessageResponse.java
        └── event/ChatEvent.java
```

### 2.3 Database Schema (chat_db — MySQL)

```sql
CREATE TABLE chat_messages (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    from_user_id    BIGINT NOT NULL,
    to_user_id      BIGINT NOT NULL,
    content         TEXT NOT NULL,
    is_read         BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP DEFAULT NOW(),
    -- Extended fields
    session_id      VARCHAR(255),
    role            ENUM('USER','ADMIN','BOT'),
    content_type    ENUM('TEXT','IMAGE','FILE'),
    ai_confidence   DOUBLE,
    metadata        JSON
);

-- Index cho query history
CREATE INDEX idx_chat_history ON chat_messages (from_user_id, to_user_id, created_at);
CREATE INDEX idx_unread ON chat_messages (to_user_id, is_read);
```

### 2.4 WebSocket Configuration

```java
// WebSocketConfig.java
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
        // Endpoint RIÊNG cho Chat — tách biệt với /ws của notification-service
        registry.addEndpoint("/chat-ws")
                .setAllowedOriginPatterns("*")
                .withSockJS();
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        // Interceptor: parse JWT từ STOMP CONNECT header → set user principal
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor = MessageHeaderAccessor
                        .getAccessor(message, StompHeaderAccessor.class);
                if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
                    String authHeader = accessor.getFirstNativeHeader("Authorization");
                    if (authHeader != null && authHeader.startsWith("Bearer ")) {
                        String email = getEmailFromToken(authHeader.substring(7));
                        if (email != null) {
                            accessor.setUser(new UsernamePasswordAuthenticationToken(
                                    email, null, new ArrayList<>()));
                        }
                    }
                }
                return message;
            }
        });
    }
}
```

### 2.5 Send Message — Push WebSocket Trực Tiếp

```java
// ChatMessageService.java — sendMessage()
@Transactional
public ChatMessageResponse sendMessage(Long fromUserId, SendChatMessageRequest request) {
    // 1. Validate & lấy profile
    UserProfileResponse fromUser = getProfileSafely(fromUserId);
    UserProfileResponse toUser   = getUserByEmail(request.getToEmail());

    // 2. Lưu vào DB
    ChatMessage saved = chatMessageRepository.save(ChatMessage.builder()
            .fromUserId(fromUser.getId())
            .toUserId(toUser.getId())
            .content(request.getContent())
            .isRead(false)
            .build());

    ChatMessageResponse response = convertToResponse(saved, fromUser, toUser);

    // 3. Push WebSocket TRỰC TIẾP (không qua Kafka)
    // Gửi đến người nhận
    messagingTemplate.convertAndSendToUser(toUser.getEmail(), "/queue/chat", response);
    // Gửi về cho người gửi (để hiển thị realtime)
    messagingTemplate.convertAndSendToUser(fromUser.getEmail(), "/queue/chat", response);

    return response;
}
```

> **Lưu ý**: Frontend KHÔNG tự add message vào state sau HTTP POST — hoàn toàn phụ thuộc vào WebSocket push để tránh duplicate message.

### 2.6 REST API Endpoints

```text
GET  /api/chat/history/{otherUserId}  ← Lịch sử chat với user khác
     Header: X-User-Id (inject bởi Gateway)

GET  /api/chat/conversations          ← Danh sách hội thoại (admin dùng)
     Header: X-User-Id

POST /api/chat/send                   ← Gửi tin nhắn
     Header: X-User-Id
     Body: { toEmail: "admin@gmail.com", content: "..." }

PUT  /api/chat/mark-read/{otherUserId} ← Đánh dấu đã đọc

GET  /api/chat/unread-count           ← Số tin chưa đọc
```

### 2.7 Dependencies (pom.xml)

```xml
<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-websocket</artifactId>  <!-- THÊM MỚI -->
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-jpa</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.cloud</groupId>
        <artifactId>spring-cloud-starter-openfeign</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.kafka</groupId>
        <artifactId>spring-kafka</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-security</artifactId>
    </dependency>
    <dependency>
        <groupId>com.mysql</groupId>
        <artifactId>mysql-connector-j</artifactId>
    </dependency>
</dependencies>
```

---

## 3. Notification Service — Cập nhật

### 3.1 Vai trò sau khi tách

Notification Service **không còn** xử lý chat. Chỉ còn:

| Topic Kafka | Xử lý |
|---|---|
| `notification-events` | Tạo in-app notification + push `/queue/notifications` + gửi email |
| `email-events` | Gửi email thuần túy |
| ~~`chat-events`~~ | ~~Đã xóa~~ — Chat tự xử lý |

### 3.2 Thay đổi trong NotificationConsumer.java

```java
// Đã XÓA listener này:
// @KafkaListener(topics = "chat-events", groupId = "notification-group")
// public void consumeChatEvent(ChatEvent event) { ... }

// Chỉ còn:
@KafkaListener(topics = "notification-events", groupId = "notification-group")
public void consumeNotificationEvent(NotificationEvent event) { ... }

@KafkaListener(topics = "email-events", groupId = "notification-group")
public void consumeEmailEvent(EmailEvent event) { ... }
```

### 3.3 WebSocket vẫn giữ nguyên

Notification Service vẫn có WebSocket riêng tại `/ws` cho notification:

```java
// Endpoint: /ws (SockJS)
// Push: /user/queue/notifications  ← Thông báo hệ thống
//       /topic/broadcast           ← Broadcast toàn hệ thống
//       /topic/escalations         ← Escalation queue (chatbot)
```

---

## 4. API Gateway — Cập nhật

### 4.1 Route mới cho Chat WebSocket

```yaml
# application.yml
spring:
  cloud:
    gateway:
      routes:
        # Notification Service (giữ nguyên)
        - id: notification-service
          uri: http://${NOTIFICATION_SERVICE_HOST:localhost}:8086
          predicates:
            - Path=/api/notifications/**, /ws/**

        # [MỚI] Chat Service WebSocket
        - id: chat-service-ws
          uri: http://${CHAT_SERVICE_HOST:localhost}:8089
          predicates:
            - Path=/chat-ws/**

        # Chat Service REST (đã có trước)
        - id: chat-service
          uri: http://${CHAT_SERVICE_HOST:localhost}:8089
          predicates:
            - Path=/api/chat/**
```

### 4.2 AuthenticationFilter — Whitelist

```java
// AuthenticationFilter.java
private String[] publicEndpoints = {
    // ... các endpoint khác ...
    "/ws/.*",          // Notification WebSocket (cũ)
    "/chat-ws/.*",     // [MỚI] Chat WebSocket — tự xác thực qua STOMP header
    // ...
};
```

> **Tại sao whitelist `/chat-ws`?**
> SockJS gửi GET `/chat-ws/info?t=...` **trước** khi upgrade WebSocket. Request này không có Authorization header (JWT chỉ được gửi trong STOMP CONNECT frame). Nếu không whitelist, Gateway trả 401 và WebSocket handshake thất bại.
>
> Bảo mật vẫn được đảm bảo vì `WebSocketConfig.java` trong chat-service tự parse JWT từ STOMP header và set User Principal.

---

## 5. Frontend — Kiến trúc WebSocket

### 5.1 Hai Context riêng biệt

```
src/context/
├── WebSocketContext.tsx        ← Kết nối /ws  (notification-service)
│     Hook: useWebSocket()
│     Dùng cho: Header (notifications), EscalationQueuePage
│
└── ChatWebSocketContext.tsx    ← [MỚI] Kết nối /chat-ws (chat-service)
      Hook: useChatWebSocket()
      Dùng cho: ChatWidget, AdminChatPage, AdminChatDetailPage
```

### 5.2 ChatWebSocketContext.tsx

```tsx
export const ChatWebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const socketUrl = `${import.meta.env.VITE_API_URL}/chat-ws`;  // → :8080/chat-ws

    const client = new Client({
        webSocketFactory: () => new SockJS(socketUrl),
        connectHeaders: {
            Authorization: `Bearer ${token}`  // JWT gửi trong STOMP CONNECT
        },
        reconnectDelay: 5000,
    });

    // Subscribe: /user/queue/chat → nhận tin nhắn realtime
};
```

### 5.3 main.tsx — Provider hierarchy

```tsx
<GoogleOAuthProvider>
  <BrowserRouter>
    <WebSocketProvider>           ← /ws — Notification
      <ChatWebSocketProvider>     ← /chat-ws — Chat
        <App />
      </ChatWebSocketProvider>
    </WebSocketProvider>
  </BrowserRouter>
</GoogleOAuthProvider>
```

### 5.4 Các component Chat sử dụng `useChatWebSocket()`

| Component | Hook cũ | Hook mới |
|---|---|---|
| `ChatWidget.tsx` | `useWebSocket()` | `useChatWebSocket()` |
| `AdminChatPage.tsx` | `useWebSocket()` | `useChatWebSocket()` |
| `AdminChatDetailPage.tsx` | `useWebSocket()` | `useChatWebSocket()` |
| `Header.tsx` | `useWebSocket()` | Giữ nguyên (notifications) |
| `EscalationQueuePage.tsx` | `useWebSocket()` | Giữ nguyên (escalation topic) |

### 5.5 Fix Duplicate Message

**Vấn đề**: Message hiện 2 lần — 1 từ HTTP response, 1 từ WebSocket push.

**Nguyên nhân**:
```
User bấm Send
  → HTTP POST → response.result → setMessages([...prev, response.result])  ← Lần 1
  → Backend push WS cho fromUser → WebSocket listener → setMessages([...prev, msg]) ← Lần 2
```

**Fix**: Bỏ `setMessages` trong handler gửi tin, chỉ để WebSocket phụ trách:

```tsx
const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
        await chatService.sendMessage({ toEmail: ADMIN_EMAIL, content: newMessage.trim() });
        // ✅ KHÔNG gọi setMessages ở đây
        // ✅ WebSocket sẽ push về cho cả fromUser và toUser
        setNewMessage('');
    } catch (error) {
        console.error('Failed to send message:', error);
    }
};
```

---

## 6. Luồng Chat Realtime — Sequence Diagram

```
Customer (FE)          API Gateway         Chat Service         Admin (FE)
     │                     │                    │                    │
     │──── CONNECT /chat-ws ──────────────────→ │                    │
     │                     │                    │ ✅ JWT verified      │
     │←─── CONNECTED ──────────────────────────│                    │
     │                     │                    │                    │
     │                     │                    │ ←── CONNECT /chat-ws ─┤
     │                     │                    │ ✅ JWT verified      │
     │                     │                    │──── CONNECTED ───────→│
     │                     │                    │                    │
     │──── POST /api/chat/send ──────────────→ │                    │
     │                     │ X-User-Id header    │                    │
     │                     │                    │ Save to DB         │
     │                     │                    │ Push WS to Admin   │
     │                     │                    │──── /queue/chat ────→│
     │                     │                    │ Push WS to Customer│
     │←── /queue/chat ─────────────────────────│                    │
     │ (message hiển thị)  │                    │ (message hiển thị) │
```

---

## 7. Ports & Service Map (Cập nhật)

| Service | Port | DB | WebSocket |
|---|---|---|---|
| API Gateway | 8080 | — | Route /ws & /chat-ws |
| Identity Service | 8081 | MySQL identity_db | — |
| User Service | 8082 | MySQL user_db | — |
| Book Service | 8083 | MySQL book_db | — |
| Order Service | 8084 | MySQL order_db | — |
| Event Service | 8085 | MySQL event_db | — |
| Notification Service | 8086 | MongoDB notification_db | **/ws** |
| File Service | 8087 | MinIO | — |
| Search Service | 8088 | Elasticsearch | — |
| **Chat Service** | **8089** | **MySQL chat_db** | **/chat-ws** |
| Chatbot Service | 8091 | MongoDB chatbot_db | — |

---

*← [04 - Microservices Specifications](./04-microservices-specifications.md)*
