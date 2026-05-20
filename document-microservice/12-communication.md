# 12 — Giao tiếp giữa các Service

> Mô tả chi tiết các pattern giao tiếp: REST (synchronous) và Kafka (asynchronous).

---

## 1. Tổng quan pattern giao tiếp

```
┌──────────────┐
│  API Gateway │
└──────┬───────┘
       │ REST (sync)
       ▼
┌──────────────────────────────────────────────────┐
│           BUSINESS SERVICES                      │
│                                                  │
│  Identity ←──REST──→ User                        │
│                                                  │
│  Order ──REST──→ Book (check stock)              │
│  Order ──REST──→ Event (apply discount)          │
│  Order ──REST──→ User (get address)              │
│                                                  │
│  Book ──────────────────────────────→ Kafka      │
│  Order ─────────────────────────────→ Kafka      │
│  Identity ──────────────────────────→ Kafka      │
└──────────────────────────────────────────────────┘
                          │ Kafka (async)
                          ▼
              ┌───────────────────────┐
              │   Notification Svc    │ ← Consumer
              │   Search Service      │ ← Consumer
              └───────────────────────┘
```

---

## 2. Synchronous (REST/HTTP)

### Khi nào dùng REST?
- Cần **kết quả ngay** để tiếp tục xử lý
- Logic phụ thuộc response (check tồn kho trước khi đặt hàng)
- Admin queries cross-service

### Các luồng REST quan trọng

#### 2.1 Order → Book Service: Kiểm tra tồn kho
```
POST /api/bills (tạo đơn hàng)
  │
Order Service
  │ GET /api/internal/books/{id}/stock   (internal REST)
  ├──→ Book Service
  │ ←── { bookId: 1, stock: 50, available: true }
  │
  │ Nếu đủ hàng → tiếp tục tạo đơn
  │ Nếu hết hàng → throw BusinessException
```

```java
// Trong Order Service — BookServiceClient
@FeignClient(name = "book-service", url = "${services.book-service.url}")
public interface BookServiceClient {

    @GetMapping("/api/internal/books/{bookId}/stock")
    BookStockResponse checkStock(@PathVariable Long bookId,
                                  @RequestHeader("X-Internal-Token") String token);

    @PutMapping("/api/internal/books/{bookId}/stock")
    void updateStock(@PathVariable Long bookId,
                     @RequestBody UpdateStockRequest request,
                     @RequestHeader("X-Internal-Token") String token);
}
```

#### 2.2 Order → Event Service: Áp dụng khuyến mãi
```
POST /api/bills (với eventCode)
  │
Order Service
  │ POST /api/internal/events/apply
  │ Body: { eventCode, userId, items, totalAmount }
  ├──→ Event Service
  │ ←── { discountAmount: 50000, finalAmount: 150000, valid: true }
  │
  │ Áp dụng discount vào đơn hàng
```

#### 2.3 Gateway → Identity Service: Validate token
```
Request with Bearer token
  │
API Gateway
  │ POST /auth/introspect { token }
  ├──→ Identity Service
  │ ←── { valid: true, userId: "123", roles: ["USER"], email: "..." }
  │
  │ Forward request + X-User-Id header → downstream service
```

> **Tối ưu**: Cache kết quả introspect trong Redis (TTL = thời gian còn lại của token) để tránh gọi Identity Service mỗi request.

### Service Discovery với OpenFeign

```java
@Configuration
public class FeignConfig {

    @Bean
    public RequestInterceptor internalTokenInterceptor() {
        return requestTemplate -> {
            // Thêm internal service token để các service nhận biết request nội bộ
            requestTemplate.header("X-Internal-Token", internalToken);
        };
    }

    @Bean
    public Retryer retryer() {
        return new Retryer.Default(100, 1000, 3); // retry 3 lần
    }
}
```

---

## 3. Asynchronous (Apache Kafka)

### Khi nào dùng Kafka?
- Không cần kết quả ngay
- Tăng throughput (gửi event, không đợi)
- Fan-out: 1 event → nhiều consumer
- Decoupling service

### Cài đặt Kafka

```yaml
# docker-compose.yml
services:
  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181

  kafka:
    image: confluentinc/cp-kafka:7.5.0
    depends_on: [zookeeper]
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:29092,PLAINTEXT_HOST://localhost:9092
      KAFKA_AUTO_CREATE_TOPICS_ENABLE: true
      KAFKA_NUM_PARTITIONS: 3
      KAFKA_DEFAULT_REPLICATION_FACTOR: 1

  kafka-ui:
    image: provectuslabs/kafka-ui:latest
    ports:
      - "8090:8080"
    environment:
      KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS: kafka:29092
```

---

## 4. Kafka Topics & Events

### 4.1 Topics

| Topic | Producer | Consumers | Mô tả |
|---|---|---|---|
| `order.created` | Order Service | Notification, Search | Đơn hàng mới |
| `order.status.updated` | Order Service | Notification | Cập nhật trạng thái |
| `order.payment.completed` | Order Service | Notification | Thanh toán xong |
| `order.cancelled` | Order Service | Book Service, Notification | Hủy đơn (hoàn kho) |
| `book.created` | Book Service | Search | Sách mới |
| `book.updated` | Book Service | Search | Sách cập nhật |
| `book.deleted` | Book Service | Search | Xóa sách |
| `book.stock.updated` | Book Service | Search | Cập nhật tồn kho |
| `user.registered` | Identity Service | Notification | Đăng ký mới |
| `auth.otp.requested` | Identity Service | Notification | Gửi OTP |

---

### 4.2 Event Payloads

```java
// order.created
@Data
@Builder
public class OrderCreatedEvent {
    private String eventId;       // UUID
    private String orderId;
    private String userId;
    private String userEmail;
    private String userName;
    private List<OrderItemDto> items;
    private BigDecimal totalAmount;
    private String shippingAddress;
    private LocalDateTime createdAt;
}

// order.status.updated
@Data
@Builder
public class OrderStatusUpdatedEvent {
    private String eventId;
    private String orderId;
    private String userId;
    private String userEmail;
    private String oldStatus;
    private String newStatus;
    private String note;
    private LocalDateTime updatedAt;
}

// book.stock.updated
@Data
@Builder
public class BookStockUpdatedEvent {
    private String eventId;
    private Long bookId;
    private String bookTitle;
    private Integer oldStock;
    private Integer newStock;
    private String reason; // "ORDER_PLACED", "ORDER_CANCELLED", "PURCHASE_INVOICE"
    private LocalDateTime updatedAt;
}
```

---

### 4.3 Producer (Order Service)

```java
@Service
@RequiredArgsConstructor
public class OrderEventPublisher {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    public void publishOrderCreated(Bill bill) {
        OrderCreatedEvent event = OrderCreatedEvent.builder()
            .eventId(UUID.randomUUID().toString())
            .orderId(bill.getId().toString())
            .userId(bill.getUserId())
            .userEmail(bill.getUserEmail())
            .totalAmount(bill.getTotalAmount())
            // ...
            .createdAt(LocalDateTime.now())
            .build();

        kafkaTemplate.send("order.created", bill.getId().toString(), event);
        log.info("Published order.created event for orderId={}", bill.getId());
    }

    public void publishOrderStatusUpdated(Bill bill, String oldStatus) {
        OrderStatusUpdatedEvent event = OrderStatusUpdatedEvent.builder()
            .eventId(UUID.randomUUID().toString())
            .orderId(bill.getId().toString())
            .userId(bill.getUserId())
            .oldStatus(oldStatus)
            .newStatus(bill.getStatus().name())
            .updatedAt(LocalDateTime.now())
            .build();

        kafkaTemplate.send("order.status.updated", bill.getId().toString(), event);
    }
}
```

---

### 4.4 Consumer (Notification Service)

```java
@Service
@Slf4j
@RequiredArgsConstructor
public class OrderEventConsumer {

    private final EmailService emailService;
    private final NotificationRepository notificationRepository;
    private final WebSocketNotificationService wsService;

    @KafkaListener(topics = "order.created", groupId = "notification-service")
    public void handleOrderCreated(OrderCreatedEvent event) {
        log.info("Received order.created event: orderId={}", event.getOrderId());

        // 1. Gửi email xác nhận
        emailService.sendOrderConfirmation(event.getUserEmail(), event);

        // 2. Lưu notification vào MongoDB
        Notification notification = Notification.builder()
            .userId(event.getUserId())
            .type("ORDER_CREATED")
            .title("Đơn hàng đã được tạo!")
            .message("Đơn hàng #" + event.getOrderId() + " trị giá " 
                     + event.getTotalAmount() + " VNĐ đã được xác nhận.")
            .referenceId(event.getOrderId())
            .read(false)
            .createdAt(LocalDateTime.now())
            .build();
        notificationRepository.save(notification);

        // 3. Push WebSocket đến user
        wsService.sendToUser(event.getUserId(), notification);
    }

    @KafkaListener(topics = "order.status.updated", groupId = "notification-service")
    public void handleOrderStatusUpdated(OrderStatusUpdatedEvent event) {
        // Gửi email + push WebSocket khi trạng thái đơn thay đổi
        emailService.sendOrderStatusUpdate(event.getUserEmail(), event);
        wsService.sendToUser(event.getUserId(), buildNotification(event));
    }
}
```

---

### 4.5 Consumer (Search Service)

```java
@Service
@Slf4j
@RequiredArgsConstructor
public class BookIndexConsumer {

    private final BookSearchRepository bookSearchRepository;

    @KafkaListener(topics = "book.created", groupId = "search-service")
    public void handleBookCreated(BookCreatedEvent event) {
        BookDocument doc = BookDocument.builder()
            .bookId(event.getBookId().toString())
            .title(event.getTitle())
            .authorName(event.getAuthorName())
            .categoryName(event.getCategoryName())
            .price(event.getPrice())
            .stock(event.getStock())
            .build();
        bookSearchRepository.save(doc);
        log.info("Indexed new book: {}", event.getTitle());
    }

    @KafkaListener(topics = "book.stock.updated", groupId = "search-service")
    public void handleStockUpdated(BookStockUpdatedEvent event) {
        bookSearchRepository.findById(event.getBookId().toString())
            .ifPresent(doc -> {
                doc.setStock(event.getNewStock());
                bookSearchRepository.save(doc);
            });
    }
}
```

---

## 5. Error Handling & Reliability

### Dead Letter Queue (DLQ)

```yaml
spring:
  kafka:
    consumer:
      group-id: notification-service
    listener:
      # Nếu consumer fail 3 lần → chuyển vào DLQ
      ack-mode: manual_immediate
```

```java
@Bean
public ConsumerFactory<String, Object> consumerFactory() {
    Map<String, Object> props = new HashMap<>();
    props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
    props.put(ConsumerConfig.MAX_POLL_INTERVAL_MS_CONFIG, 300000); // 5 phút
    // ...
    return new DefaultKafkaConsumerFactory<>(props);
}

@Bean
public KafkaListenerContainerFactory<?> kafkaListenerContainerFactory() {
    ConcurrentKafkaListenerContainerFactory<String, Object> factory =
        new ConcurrentKafkaListenerContainerFactory<>();
    factory.setCommonErrorHandler(
        new DefaultErrorHandler(
            new DeadLetterPublishingRecoverer(kafkaTemplate),
            new FixedBackOff(1000L, 3) // Retry 3 lần, delay 1s
        )
    );
    return factory;
}
```

### Idempotency (Chống xử lý trùng)

```java
@KafkaListener(topics = "order.created")
public void handleOrderCreated(OrderCreatedEvent event) {
    // Kiểm tra đã xử lý event này chưa (dùng eventId)
    if (processedEventRepository.existsByEventId(event.getEventId())) {
        log.warn("Duplicate event ignored: {}", event.getEventId());
        return;
    }

    // Xử lý...

    // Đánh dấu đã xử lý
    processedEventRepository.save(ProcessedEvent.of(event.getEventId()));
}
```

---

## 6. Internal Service Authentication

Để bảo vệ `/api/internal/**` endpoints (chỉ service-to-service):

```java
// Option 1: Shared Internal Token (simple)
// Mỗi service call thêm header: X-Internal-Token: ${INTERNAL_SECRET}

// Option 2: mTLS (mutual TLS) — production grade

// Option 3: Kubernetes Network Policy — chỉ cho phép pod-to-pod traffic
```

---

*← [11 - Search Service](./11-search-service.md) | [13 - Hạ tầng →](./13-infrastructure.md)*
