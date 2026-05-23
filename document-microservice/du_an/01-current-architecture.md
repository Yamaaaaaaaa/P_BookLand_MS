# 01 — Phân tích kiến trúc Monolithic hiện tại

> Tài liệu phân tích cấu trúc hệ thống BookLand **trước khi** chuyển sang Microservice.

---

## 1. Tổng quan hiện tại

Hệ thống **BookLand** hiện đang chạy theo mô hình **Monolithic** — toàn bộ logic nghiệp vụ được đóng gói trong một ứng dụng Spring Boot duy nhất.

```
PTIT_BookLand/
├── BookLand_BE/         ← Spring Boot 3 (Java 17) — 1 JAR duy nhất
│   └── src/
│       └── main/java/.../bookland_be/
│           ├── config/          ← SecurityConfig, WebSocket, CORS...
│           ├── controller/      ← REST API endpoints
│           │   ├── admin/       ← Admin-only endpoints
│           │   └── common/      ← Public/user endpoints
│           ├── service/         ← Business logic
│           ├── repository/      ← JPA repositories
│           ├── entity/          ← JPA entities (30 entities)
│           ├── dto/             ← Request/Response DTOs
│           ├── mapper/          ← MapStruct mappers
│           └── exception/       ← Global exception handling
│
├── BookLand_FE/         ← React 18 + TypeScript + Vite
└── BookLand_DB/         ← MySQL schema & migration scripts
```

---

## 2. Tech Stack hiện tại

| Thành phần | Công nghệ |
|---|---|
| **Framework** | Spring Boot 3.x (Java 17) |
| **Database** | MySQL 8 (duy nhất) |
| **Cache** | Redis |
| **Auth** | JWT custom + OAuth2 Resource Server |
| **OAuth2** | Google Login |
| **Storage** | Supabase Storage |
| **Real-time** | WebSocket (STOMP over SockJS) |
| **Email** | Spring Mail + Thymeleaf template |
| **Build** | Gradle |
| **Deploy** | Docker Compose |

---

## 3. Danh sách entity (30 entities — 1 DB)

### 🔐 Identity / User
| Entity | Mô tả |
|---|---|
| `User` | Người dùng (email, name, avatar, role) |
| `Role` | Vai trò (ADMIN, MANAGER, USER...) |
| `Permission` | Quyền hạn chi tiết |
| `InvalidatedToken` | Token đã logout (blacklist) |
| `Address` | Địa chỉ giao hàng của user |

### 📚 Catalog (Sách)
| Entity | Mô tả |
|---|---|
| `Book` | Sách (title, price, stock, images) |
| `Author` | Tác giả |
| `Category` | Danh mục sách |
| `Publisher` | Nhà xuất bản |
| `Serie` | Bộ sách/Series |
| `Supplier` | Nhà cung cấp |
| `PurchaseInvoice` | Phiếu nhập kho |
| `PurchaseInvoiceBook` | Chi tiết phiếu nhập |
| `BookComment` | Review/đánh giá sách |
| `Wishlist` | Danh sách yêu thích |

### 🛒 Order / Commerce
| Entity | Mô tả |
|---|---|
| `Cart` | Giỏ hàng |
| `CartItem` | Chi tiết giỏ hàng |
| `Bill` | Đơn hàng (hóa đơn) |
| `BillBook` | Chi tiết đơn hàng |
| `PaymentMethod` | Phương thức thanh toán |
| `PaymentTransaction` | Giao dịch thanh toán (VNPay) |
| `ShippingMethod` | Phương thức vận chuyển |

### 🎉 Event / Promotion
| Entity | Mô tả |
|---|---|
| `Event` | Sự kiện/khuyến mãi |
| `EventAction` | Hành động của event |
| `EventRule` | Điều kiện áp dụng |
| `EventTarget` | Đối tượng áp dụng |
| `EventImage` | Hình ảnh sự kiện |
| `EventLog` | Lịch sử áp dụng event |

### 🔔 Notification / Chat
| Entity | Mô tả |
|---|---|
| `Notification` | Thông báo hệ thống |
| `ChatMessage` | Tin nhắn chat |

---

## 4. Danh sách Controllers & Services

### Controllers (19 controllers)
```
common/
├── AuthenticationController  → /auth/**
├── UserController            → /api/users/**
├── BookController            → /api/books/**
├── AuthorController          → /api/authors/**
├── CategoryController        → /api/categories/**
├── SerieController           → /api/series/**
├── PublisherController       → /api/publishers/**
├── SupplierController        → /api/suppliers/**
├── BillController            → /api/bills/**
├── CartController            → /api/carts/**
├── EventController           → /api/events/**
├── PaymentController         → /vnpay/**
├── PaymentMethodController   → /api/payment-methods/**
├── ShippingMethodController  → /api/shipping-methods/**
├── RoleController            → /api/roles/**
├── UploadController          → /api/upload/**
└── HomeController            → /home

admin/
├── AdminUserController       → /admin/users/**
└── AdminHomeController       → /admin

(root)
├── BookCommentController     → /api/comments/**
├── NotificationController    → /api/notifications/**
├── WishlistController        → /api/wishlists/**
└── ChatMessageController     → WebSocket
```

---

## 5. Điểm mạnh & Điểm yếu của Monolith

### ✅ Điểm mạnh
- **Đơn giản**: 1 app, 1 DB, dễ phát triển ban đầu
- **Nhất quán**: Transaction ACID dễ dàng qua JPA
- **Debug dễ**: Trace flow trong cùng 1 process
- **Đã chạy được**: Có Docker Compose, CI/CD cơ bản

### ❌ Điểm yếu & lý do cần chuyển đổi

| Vấn đề | Mô tả |
|---|---|
| **Single point of failure** | 1 bug có thể làm sập toàn bộ hệ thống |
| **Scale không linh hoạt** | Phải scale cả app dù chỉ `BookService` tải cao |
| **Deploy chậm** | Build lại toàn bộ dù chỉ sửa 1 feature nhỏ |
| **Tech lock-in** | Toàn bộ phải dùng Java, không thể dùng tech phù hợp hơn |
| **DB coupling** | Tất cả share chung 1 MySQL, schema lớn khó maintain |
| **Team coupling** | Khó phát triển song song nhiều tính năng |
| **Không có search** | Không có Elasticsearch, search cơ bản qua SQL `LIKE` |
| **Storage** | Supabase Storage bị phụ thuộc bên ngoài, không tự host |

---

## 6. Mô hình triển khai hiện tại

```yaml
# docker-compose.yml hiện tại
services:
  bookland-db:    # MySQL 8
  bookland-redis: # Redis 7
  bookland-be:    # Spring Boot (port 8080)
  bookland-fe:    # React + Nginx (port 5173)
```

**Vấn đề**: Mọi thứ chạy trong 1 compose, deploy lại 1 service phải restart cả stack.

---

## 7. Flow xác thực hiện tại

```
Client → POST /auth/login
       ← JWT (access_token + refresh_token)
       
Client → GET /api/books [Bearer token]
       → SecurityConfig validate JWT
       → CustomJwtDecoder kiểm tra token có bị logout không (Redis)
       → Cho phép / từ chối
```

Sau khi chuyển sang Microservice, flow này sẽ được chuyển vào **Identity Service** và **API Gateway** đảm nhiệm.

---

*← [README](./README.md) | [02 - Kiến trúc mục tiêu →](./02-target-architecture.md)*
