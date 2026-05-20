# 14 — Lộ trình di chuyển (Migration Roadmap)

> Kế hoạch từng bước chuyển đổi BookLand từ Monolith → Microservice, ưu tiên rủi ro thấp trước.

---

## Chiến lược: Strangler Fig Pattern

Thay vì viết lại toàn bộ (Big Bang), dùng **Strangler Fig Pattern**:
1. Dựng Microservice mới **song song** với Monolith
2. Dần dần chuyển traffic từ Monolith sang Microservice
3. Khi toàn bộ đã chuyển → tắt Monolith

```
         Ban đầu                    Giữa chừng               Hoàn thành
   ┌──────────────┐          ┌──────────────────┐        ┌──────────────────┐
   │   Monolith   │          │ Monolith (partial)│        │ (Monolith off)   │
   │  (tất cả)    │          │  - Order (còn)   │        │                  │
   └──────────────┘   ──→    │  - Event (còn)   │  ──→   │  Microservices   │
                             ├──────────────────┤        │  (tất cả)        │
                             │ New Microservices │        │                  │
                             │  - Identity ✓    │        └──────────────────┘
                             │  - Book ✓        │
                             └──────────────────┘
```

---

## Phase 0: Chuẩn bị (1-2 tuần)

### Mục tiêu
Thiết lập hạ tầng cơ bản và cấu hình định tuyến DNS trước khi tách service.

### Checklist
- [ ] Tạo thư mục dự án: `PTIT_BookLand_Microservice/` (mỗi service là project độc lập)
- [ ] Cấu hình **DNS Service Discovery** cục bộ (dùng tên container của Docker)
- [ ] Dựng **API Gateway** cơ bản (chỉ proxy, chưa có auth filter)
- [ ] Thiết lập **Kafka** + Zookeeper trong Docker Compose
- [ ] Thiết lập **Redis** dùng chung
- [ ] Thiết lập **Kafka UI** để debug

### Deliverables
```
services/
└── api-gateway/       ← ✅ Running (proxy mode)
```

---

## Phase 1: Identity Service (1-2 tuần)

### Ưu tiên: 🔴 CAO — Nền tảng cho mọi thứ

### Tại sao làm đầu tiên?
- Mọi service đều cần Auth
- Gateway cần Identity Service để validate token
- Tách ra không ảnh hưởng business logic khác

### Các bước

**1. Tạo Identity Service project**
```
services/identity-service/
├── entity: User (auth fields), Role, Permission, InvalidatedToken
├── API: POST /auth/register, /auth/login, /auth/refresh, /auth/logout
├── Database: identity_db (MySQL riêng)
└── Redis: blacklist token
```

**2. Migrate data**
```sql
-- Export từ bookland_db (Monolith)
SELECT id, email, password, enabled, created_at FROM users;
SELECT * FROM roles;
SELECT * FROM permissions;
SELECT * FROM role_permissions;
SELECT * FROM user_roles;
SELECT * FROM invalidated_tokens;

-- Import vào identity_db
```

**3. Cập nhật API Gateway**
```yaml
# Bật Authentication Filter
filter:
  - AuthenticationFilter  ← gọi Identity Service để validate
```

**4. Cập nhật Frontend** (không cần thay đổi — URL /auth/** vẫn giống)

**5. Monolith**: Tắt Auth endpoints, redirect sang Identity Service

### Test cases
- [ ] Đăng ký tài khoản mới
- [ ] Đăng nhập email/password
- [ ] Đăng nhập Google OAuth2
- [ ] Refresh token
- [ ] Đăng xuất (blacklist token)
- [ ] Request có token hợp lệ được cho qua Gateway
- [ ] Request có token hết hạn bị chặn

---

## Phase 2: Book Service (2-3 tuần)

### Ưu tiên: 🔴 CAO — Core business domain

### Tại sao làm thứ hai?
- Sách là domain trung tâm, nhiều service sẽ phụ thuộc
- Phần lớn GET requests là public → dễ migrate
- Cần tách trước Order Service (Order cần gọi Book)

### Các bước

**1. Tạo Book Service project**
```
services/book-service/
├── entity: Book, Author, Category, Publisher, Serie, Supplier
│           PurchaseInvoice, PurchaseInvoiceBook, BookComment
├── API: /api/books/**, /api/authors/**, /api/categories/**...
├── Database: book_db (MySQL riêng)
└── Kafka: Publish book.created, book.updated, book.stock.updated
```

**2. Migrate data**
```sql
-- Export từ bookland_db
SELECT * FROM books;
SELECT * FROM authors;
SELECT * FROM categories;
-- ... tất cả book-related tables
```

**3. Internal API cho Order Service**
```java
// /api/internal/books/{id}/stock  (GET + PUT)
// Protected by X-Internal-Token header
```

**4. Dựng Search Service song song** (consumer Kafka từ Book Service)

### Test cases
- [ ] CRUD sách (Admin)
- [ ] Xem danh sách sách (public)
- [ ] Tìm kiếm sách qua Search Service
- [ ] Thêm review sách
- [ ] Nhập kho → stock cập nhật → Kafka event → Search index cập nhật

---

## Phase 3: Notification Service (1-2 tuần)

### Ưu tiên: 🟡 TRUNG BÌNH

### Tại sao làm sớm?
- Cần có Notification trước khi tách Order (Order gửi email khi tạo đơn)
- Độc lập, không phụ thuộc service nào khác
- Kafka consumer → dễ test độc lập

### Các bước

**1. Tạo Notification Service project**
```
services/notification-service/
├── entity: Notification (MongoDB), ChatMessage (MongoDB)
├── API: /api/notifications/**, /ws/**
├── Database: notification_db (MongoDB)
├── Kafka: Consumer order.created, order.status.updated...
└── WebSocket: STOMP endpoint
```

**2. Migrate WebSocket logic** từ Monolith

**3. Migrate Email logic** từ EmailService trong Monolith

### Test cases
- [ ] Nhận Kafka event → lưu Notification MongoDB
- [ ] Push WebSocket đến user khi có notification mới
- [ ] Gửi email xác nhận đơn hàng
- [ ] API lấy danh sách notification
- [ ] Đánh dấu đã đọc

---

## Phase 4: File Service (1 tuần)

### Ưu tiên: 🟡 TRUNG BÌNH

### Tại sao làm sớm?
- Stateless service, dễ tách nhất
- Book Service và User Service cần upload ảnh

### Các bước

**1. Tạo File Service project**
```
services/file-service/
├── Tích hợp MinIO (thay Supabase hoặc giữ Supabase)
├── API: POST /api/files/upload, DELETE /api/files/{id}
└── Trả về public URL
```

**2. Cập nhật Book Service và User Service** để gọi File Service thay vì SupabaseStorageService

### Test cases
- [ ] Upload ảnh sách
- [ ] Upload avatar user
- [ ] Xóa file

---

## Phase 5: Order Service (2-3 tuần)

### Ưu tiên: 🔴 CAO — Core E-Commerce

### Phức tạp nhất vì:
- Phụ thuộc Book Service (check stock)
- Phụ thuộc User Service (địa chỉ)
- Phụ thuộc Event Service (khuyến mãi)
- Có VNPay integration
- Có WebSocket notification khi thay đổi trạng thái

### Các bước

**1. Tạo Order Service project**
```
services/order-service/
├── entity: Cart, CartItem, Bill, BillBook
│           PaymentMethod, PaymentTransaction, ShippingMethod
├── API: /api/bills/**, /api/carts/**, /vnpay/**, ...
├── Database: order_db (MySQL riêng)
├── Feign Client: BookServiceClient, UserServiceClient, EventServiceClient
└── Kafka: Publish order.created, order.status.updated, order.cancelled
```

**2. Xử lý Distributed Transaction**

Khi tạo đơn hàng:
```
1. Check stock (Book Service) → OK
2. Tạo Bill trong order_db → OK
3. Giảm stock (Book Service) → có thể fail!
4. Publish order.created Kafka → OK
```

Dùng **Saga Pattern (Choreography)**:
```
Order Service: Tạo bill (status = PENDING_STOCK)
            → Publish "order.stock.deduct.requested"

Book Service: Trừ stock
            → Publish "stock.deducted.success" hoặc "stock.deducted.failed"

Order Service: Nhận result
            → Nếu success: Bill status = CONFIRMED
            → Nếu failed: Bill status = CANCELLED, hoàn kho
```

### Test cases
- [ ] Thêm/xóa sản phẩm vào giỏ hàng
- [ ] Tạo đơn hàng → stock bị trừ → email xác nhận gửi
- [ ] Hủy đơn hàng → stock được hoàn lại → email hủy gửi
- [ ] Thanh toán VNPay → callback → cập nhật trạng thái
- [ ] Admin thay đổi trạng thái → WebSocket push

---

## Phase 6: Event & Search Service (1-2 tuần)

### Event Service
- Tách `Event`, `EventRule`, `EventAction`... ra service riêng
- Internal API để Order Service tính discount

### Search Service
- Đã có consumer Kafka từ Phase 2
- Cần verify Elasticsearch index đầy đủ
- Thêm API autocomplete, filter nâng cao

---

## Phase 7: User Service (1 tuần)

### Ưu tiên: 🟢 THẤP

### Các bước
- Tách User profile, Address, Wishlist ra User Service
- Đây là phase cuối vì User profile ít business logic nhất

---

## Phase 8: Cleanup & Production Hardening (1-2 tuần)

- [ ] Tắt Monolith hoàn toàn
- [ ] Thiết lập Prometheus + Grafana dashboard
- [ ] Thiết lập Zipkin distributed tracing
- [ ] Load test từng service
- [ ] Thiết lập Circuit Breaker cho mọi Feign client
- [ ] Review Security (internal tokens, CORS)
- [ ] Documentation API (Swagger cho từng service)
- [ ] Setup CI/CD pipeline cho từng service

---

## Timeline Tổng quan

```
Tuần  1-2:  Phase 0 (Infra)           ████░░░░░░░░░░░░░░░
Tuần  3-4:  Phase 1 (Identity)        ░░░░████░░░░░░░░░░░
Tuần  5-7:  Phase 2 (Book)            ░░░░░░░░████████░░░
Tuần  8-9:  Phase 3 (Notification)    ░░░░░░░░░░░░░░░████
Tuần 10:    Phase 4 (File)            ░░░░░░░░░░░░░░░░░░████
Tuần 11-13: Phase 5 (Order)          ░░░░░░░░░░░░░░░░░░░███████
Tuần 14-15: Phase 6 (Event+Search)   ░░░░░░░░░░░░░░░░░░░░░░░████
Tuần 16:    Phase 7 (User)           ░░░░░░░░░░░░░░░░░░░░░░░░░███
Tuần 17-18: Phase 8 (Hardening)      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░████

Tổng: ~18 tuần (4-5 tháng) cho 1 team 2-3 developer
```

---

## Rủi ro & Giải pháp

| Rủi ro | Mức độ | Giải pháp |
|---|---|---|
| **Distributed Transaction** (đặt hàng → trừ kho) | 🔴 CAO | Saga Pattern + Compensating transactions |
| **Data Migration** (mất data khi copy DB) | 🔴 CAO | Test kỹ trên staging, sync song song |
| **Latency tăng** (nhiều service call nhau) | 🟡 TRUNG | Cache Redis, tối ưu Feign, async Kafka |
| **Debugging khó** (trace qua nhiều service) | 🟡 TRUNG | Zipkin distributed tracing |
| **Config phân tán** | 🟡 TRUNG | Spring Cloud Config Server |
| **Team thiếu kinh nghiệm Kafka** | 🟡 TRUNG | Training, bắt đầu với Notification đơn giản |

---

## Điều kiện "Definition of Done" cho mỗi Phase

1. ✅ Service build thành công, unit tests pass
2. ✅ Integration test với service liên quan pass
3. ✅ Docker Compose chạy được
4. ✅ API Swagger documented
5. ✅ Data đã được migrate từ Monolith
6. ✅ Frontend không bị lỗi (smoke test)
7. ✅ Kafka events publish/consume đúng
8. ✅ Monitoring (Prometheus metrics endpoint `/actuator/prometheus`)

---

*← [13 - Hạ tầng](./13-infrastructure.md) | [15 - Kim chỉ nam triển khai →](./15-master-implementation-guide.md)*
