# 03 — Phân rã Service (Service Decomposition)

> Tài liệu mô tả chi tiết cách phân chia các chức năng từ Monolith sang từng Microservice.

---

## Nguyên tắc phân rã (DDD - Domain-Driven Design)

Áp dụng **Domain-Driven Design** để xác định **Bounded Context** cho từng service:

```
Mỗi service = 1 Domain (nghiệp vụ độc lập)
            = 1 Team phụ trách
            = 1 Database riêng
            = 1 Repository Git riêng (tùy chọn)
```

---

## 1. Identity Service

**Port**: `8081` | **DB**: `MySQL (identity_db)`

### Trách nhiệm
- Đăng ký tài khoản (email/password)
- Đăng nhập (email/password, Google OAuth2)
- Phát hành & làm mới JWT token
- Đăng xuất (blacklist token vào Redis)
- Quản lý Role & Permission

### Entities được di chuyển
| Entity hiện tại | → Service |
|---|---|
| `User` (auth fields: email, password, role) | Identity Service |
| `Role` | Identity Service |
| `Permission` | Identity Service |
| `InvalidatedToken` | Identity Service |

### API Endpoints
```
POST   /auth/register          ← Đăng ký
POST   /auth/login             ← Đăng nhập
POST   /auth/refresh           ← Refresh token
POST   /auth/logout            ← Đăng xuất
POST   /auth/google            ← Google OAuth2
POST   /auth/introspect        ← Kiểm tra token (dùng nội bộ)
GET    /auth/roles             ← CRUD roles (Admin)
POST   /auth/roles
PUT    /auth/roles/{id}
DELETE /auth/roles/{id}
```

### Dependencies
- **Redis**: Lưu blacklist token (InvalidatedToken)
- Không phụ thuộc service nào khác

---

## 2. User Service

**Port**: `8082` | **DB**: `MySQL (user_db)`

### Trách nhiệm
- Quản lý thông tin cá nhân người dùng (profile)
- Địa chỉ giao hàng
- Danh sách yêu thích (Wishlist)
- Upload avatar

### Entities được di chuyển
| Entity hiện tại | → Service |
|---|---|
| `User` (profile fields: name, avatar, phone) | User Service |
| `Address` | User Service |
| `Wishlist` | User Service |

### API Endpoints
```
GET    /api/users/me           ← Lấy thông tin bản thân
PUT    /api/users/me           ← Cập nhật profile
GET    /api/users/{id}         ← Lấy profile user (Admin)
GET    /api/users              ← Danh sách users (Admin)
PATCH  /api/users/{id}/status ← Kích hoạt/khóa account (Admin)

POST   /api/addresses          ← Thêm địa chỉ
GET    /api/addresses          ← Danh sách địa chỉ của tôi
PUT    /api/addresses/{id}     ← Cập nhật địa chỉ
DELETE /api/addresses/{id}     ← Xóa địa chỉ

POST   /api/wishlists/{bookId} ← Thêm vào yêu thích
GET    /api/wishlists          ← Danh sách yêu thích
DELETE /api/wishlists/{bookId} ← Xóa khỏi yêu thích
```

### Dependencies
- **Identity Service**: Nhận `userId` từ JWT (via Gateway header)
- **Book Service**: Lấy thông tin sách cho Wishlist (REST call)

---

## 3. Book Service

**Port**: `8083` | **DB**: `MySQL (book_db)`

### Trách nhiệm
- CRUD sách, tác giả, danh mục, nhà xuất bản, nhà cung cấp, series
- Quản lý tồn kho (inventory)
- Review/đánh giá sách
- Nhập kho (Purchase Invoice)
- Publish event khi tồn kho thay đổi

### Entities được di chuyển
| Entity hiện tại | → Service |
|---|---|
| `Book` | Book Service |
| `Author` | Book Service |
| `Category` | Book Service |
| `Publisher` | Book Service |
| `Serie` | Book Service |
| `Supplier` | Book Service |
| `PurchaseInvoice` | Book Service |
| `PurchaseInvoiceBook` | Book Service |
| `BookComment` | Book Service |

### API Endpoints
```
# Public (không cần auth)
GET    /api/books                     ← Danh sách sách (filter, paginate)
GET    /api/books/{id}                ← Chi tiết sách
GET    /api/books/best-sellers        ← Bestsellers
GET    /api/categories                ← Danh mục
GET    /api/authors                   ← Tác giả
GET    /api/publishers                ← Nhà xuất bản
GET    /api/series                    ← Series

# Authenticated
POST   /api/books/{id}/comments       ← Đánh giá sách
GET    /api/books/{id}/comments       ← Đọc đánh giá
DELETE /api/books/{id}/comments/{cId} ← Xóa đánh giá (owner/admin)

# Admin only
POST   /api/books                     ← Thêm sách
PUT    /api/books/{id}                ← Cập nhật sách
DELETE /api/books/{id}                ← Xóa sách
POST   /api/purchase-invoices         ← Nhập kho
GET    /api/purchase-invoices         ← Lịch sử nhập kho

# Internal (từ Order Service)
GET    /api/internal/books/{id}/stock  ← Kiểm tra tồn kho
PUT    /api/internal/books/{id}/stock  ← Cập nhật tồn kho
```

### Kafka Events Published
```
Topic: book.stock.updated
Payload: { bookId, oldStock, newStock, reason }

Topic: book.created
Payload: { bookId, title, category, price }
```

### Dependencies
- **Search Service**: Publish event khi book thay đổi (Kafka)
- **File Service**: Lấy URL ảnh sách

---

## 4. Order Service

**Port**: `8084` | **DB**: `MySQL (order_db)`

### Trách nhiệm
- Quản lý giỏ hàng
- Tạo và xử lý đơn hàng (Bill)
- Tích hợp thanh toán VNPay
- Quản lý phương thức vận chuyển
- Thay đổi trạng thái đơn hàng

### Entities được di chuyển
| Entity hiện tại | → Service |
|---|---|
| `Cart` | Order Service |
| `CartItem` | Order Service |
| `Bill` | Order Service |
| `BillBook` | Order Service |
| `PaymentMethod` | Order Service |
| `PaymentTransaction` | Order Service |
| `ShippingMethod` | Order Service |

### API Endpoints
```
# Cart
GET    /api/carts                     ← Lấy giỏ hàng
POST   /api/carts/items               ← Thêm vào giỏ
PUT    /api/carts/items/{id}          ← Cập nhật số lượng
DELETE /api/carts/items/{id}          ← Xóa khỏi giỏ
DELETE /api/carts                     ← Xóa toàn bộ giỏ

# Bill (Order)
POST   /api/bills                     ← Tạo đơn hàng
GET    /api/bills                     ← Đơn hàng của tôi
GET    /api/bills/{id}                ← Chi tiết đơn hàng
PUT    /api/bills/{id}/cancel         ← Hủy đơn
PUT    /api/bills/{id}/status         ← Cập nhật trạng thái (Admin)
GET    /api/admin/bills               ← Tất cả đơn hàng (Admin)

# Payment (VNPay)
POST   /api/payment/vnpay/create      ← Tạo link thanh toán
GET    /vnpay/return                  ← Callback từ VNPay
GET    /vnpay/ipn                     ← IPN từ VNPay

# Shipping / Payment Methods
GET    /api/shipping-methods          ← Phương thức vận chuyển
GET    /api/payment-methods           ← Phương thức thanh toán
```

### Kafka Events Published
```
Topic: order.created
Payload: { orderId, userId, items, totalAmount, email }

Topic: order.status.updated
Payload: { orderId, userId, oldStatus, newStatus, email }

Topic: order.payment.completed
Payload: { orderId, userId, amount, method }
```

### Dependencies
- **Book Service**: Kiểm tra & cập nhật tồn kho (REST internal)
- **User Service**: Lấy địa chỉ giao hàng (REST)
- **Notification Service**: Gửi email/push (Kafka)

---

## 5. Event Service

**Port**: `8085` | **DB**: `MySQL (event_db)`

### Trách nhiệm
- Quản lý sự kiện/khuyến mãi
- Áp dụng rule giảm giá
- Tracking EventLog

### Entities được di chuyển
| Entity hiện tại | → Service |
|---|---|
| `Event` | Event Service |
| `EventAction` | Event Service |
| `EventRule` | Event Service |
| `EventTarget` | Event Service |
| `EventImage` | Event Service |
| `EventLog` | Event Service |

### API Endpoints
```
# Public
GET    /api/events/highest-priority   ← Banner sự kiện nổi bật
GET    /api/events                    ← Danh sách sự kiện
GET    /api/events/{id}               ← Chi tiết sự kiện

# Authenticated
POST   /api/events/{id}/apply         ← Áp dụng khuyến mãi vào đơn hàng

# Admin
POST   /api/events                    ← Tạo sự kiện
PUT    /api/events/{id}               ← Cập nhật sự kiện
DELETE /api/events/{id}               ← Xóa sự kiện
```

### Dependencies
- **Order Service**: Tính giá sau khuyến mãi (REST internal)

---

## 6. Notification Service

**Port**: `8086` | **DB**: `MongoDB (notification_db)`

### Trách nhiệm
- Nhận Kafka events và xử lý thông báo
- Gửi email (Order status, OTP, Welcome)
- Push real-time notification qua WebSocket (STOMP)
- Lưu lịch sử notification
- Chat messages

### Entities được di chuyển
| Entity hiện tại | → Service |
|---|---|
| `Notification` | Notification Service (MongoDB) |
| `ChatMessage` | Notification Service (MongoDB) |

### API Endpoints
```
GET    /api/notifications              ← Thông báo của tôi
PUT    /api/notifications/{id}/read    ← Đánh dấu đã đọc
PUT    /api/notifications/read-all     ← Đọc tất cả

WS     /ws                            ← WebSocket endpoint
       /topic/user/{userId}           ← Nhận notification cá nhân
       /topic/broadcast               ← Broadcast toàn hệ thống
       /app/chat                      ← Gửi tin nhắn chat
```

### Kafka Events Consumed
```
Topic: order.created          → Gửi email xác nhận đơn hàng
Topic: order.status.updated   → Gửi email + WebSocket push
Topic: order.payment.completed → Gửi email thanh toán thành công
Topic: user.registered        → Gửi email welcome
Topic: auth.otp.requested     → Gửi OTP email
```

### Dependencies
- **MongoDB**: Lưu notification (schema-less, phù hợp)
- **Kafka**: Consume events từ các service khác
- **Redis**: Rate limiting email

---

## 7. File Service

**Port**: `8087` | **Storage**: `MinIO (self-hosted) hoặc Supabase Storage`

### Trách nhiệm
- Upload ảnh sách, avatar, ảnh sự kiện
- Resize & optimize ảnh
- Trả về public URL
- Xóa file khi entity bị xóa

### API Endpoints
```
POST   /api/files/upload              ← Upload 1 file
POST   /api/files/upload-multiple     ← Upload nhiều file
DELETE /api/files/{fileId}            ← Xóa file
GET    /api/files/{fileId}/info       ← Thông tin file
```

### Strategy
```
Hiện tại: Supabase Storage (cloud) - giữ nguyên hoặc
Mục tiêu: MinIO (self-hosted Docker) cho dev/staging
Production: AWS S3 hoặc tiếp tục Supabase
```

### Dependencies
- Không phụ thuộc service nào
- Các service khác gọi File Service để upload và nhận URL

---

## 8. Search Service

**Port**: `8088` | **DB**: `Elasticsearch`

### Trách nhiệm
- Index dữ liệu sách từ Book Service
- Full-text search (tìm kiếm theo tên, tác giả, mô tả)
- Filter nâng cao (giá, category, rating...)
- Autocomplete (suggest khi gõ)
- Trending / Popular searches

### API Endpoints
```
GET    /api/search/books              ← Tìm kiếm sách
       ?q=harry+potter
       &category=fantasy
       &minPrice=50000
       &maxPrice=200000
       &page=0&size=20

GET    /api/search/books/suggest      ← Autocomplete suggestions
GET    /api/search/books/trending     ← Sách đang trend
```

### Kafka Events Consumed
```
Topic: book.created          → Index sách mới
Topic: book.updated          → Cập nhật index
Topic: book.deleted          → Xóa khỏi index
Topic: book.stock.updated    → Cập nhật trường stock trong index
```

### Elasticsearch Index Schema
```json
{
  "mappings": {
    "properties": {
      "bookId": { "type": "keyword" },
      "title": { "type": "text", "analyzer": "vietnamese" },
      "description": { "type": "text" },
      "authorName": { "type": "text" },
      "categoryName": { "type": "keyword" },
      "price": { "type": "double" },
      "stock": { "type": "integer" },
      "rating": { "type": "float" },
      "imageUrl": { "type": "keyword", "index": false },
      "createdAt": { "type": "date" }
    }
  }
}
```

---

## Tóm tắt phân rã

```
Monolith (30 entities, 1 DB)
        │
        ├── Identity Service  (4 entities: User auth, Role, Permission, Token)
        ├── User Service      (3 entities: User profile, Address, Wishlist)
        ├── Book Service      (9 entities: Book, Author, Category, Publisher...)
        ├── Order Service     (7 entities: Cart, Bill, Payment, Shipping...)
        ├── Event Service     (6 entities: Event, Rules, Actions, Logs...)
        ├── Notification Svc  (2 entities: Notification, ChatMessage → MongoDB)
        ├── File Service      (0 entities → Stateless storage service)
        └── Search Service    (0 entities → Elasticsearch index)
```

---

*← [02 - Kiến trúc mục tiêu](./02-target-architecture.md) | [04 - Đặc tả Chi tiết các Dịch vụ](./04-microservices-specifications.md) →*
