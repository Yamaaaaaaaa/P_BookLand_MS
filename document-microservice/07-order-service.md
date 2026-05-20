# 07 — Order Service & Payment

> Quản lý giỏ hàng, đơn hàng và thanh toán VNPay.

---

## 1. Tổng quan

**Port**: `8084` | **Database**: `MySQL (order_db)` | **Kafka**: Producer + Consumer

Đây là service **phức tạp nhất** vì phụ thuộc nhiều service khác và xử lý distributed transaction.

---

## 2. Database Schema (order_db)

```sql
CREATE TABLE carts (
    id          BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id     BIGINT NOT NULL UNIQUE,   -- 1 user = 1 cart
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW() ON UPDATE NOW()
);

CREATE TABLE cart_items (
    id          BIGINT PRIMARY KEY AUTO_INCREMENT,
    cart_id     BIGINT REFERENCES carts(id),
    book_id     BIGINT NOT NULL,             -- reference to Book Service
    book_title  VARCHAR(500),               -- denormalized
    book_price  DECIMAL(15,2),              -- snapshot price
    book_image  VARCHAR(1000),              -- denormalized
    quantity    INT NOT NULL DEFAULT 1,
    updated_at  TIMESTAMP DEFAULT NOW() ON UPDATE NOW()
);

CREATE TABLE bills (
    id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id             BIGINT NOT NULL,
    user_email          VARCHAR(255),        -- denormalized
    user_name           VARCHAR(255),        -- denormalized
    status              ENUM('PENDING','CONFIRMED','SHIPPING','COMPLETED','CANCELLED'),
    subtotal            DECIMAL(15,2),
    discount_amount     DECIMAL(15,2) DEFAULT 0,
    shipping_fee        DECIMAL(15,2) DEFAULT 0,
    total_amount        DECIMAL(15,2),
    shipping_address    TEXT,               -- snapshot address
    shipping_method_id  BIGINT,
    payment_method_id   BIGINT,
    event_code          VARCHAR(100),       -- mã khuyến mãi áp dụng
    note                TEXT,
    created_at          TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP DEFAULT NOW() ON UPDATE NOW()
);

CREATE TABLE bill_books (
    id          BIGINT PRIMARY KEY AUTO_INCREMENT,
    bill_id     BIGINT REFERENCES bills(id),
    book_id     BIGINT NOT NULL,
    book_title  VARCHAR(500),               -- snapshot
    unit_price  DECIMAL(15,2),             -- snapshot price
    quantity    INT NOT NULL
);

CREATE TABLE payment_methods (
    id      INT PRIMARY KEY AUTO_INCREMENT,
    name    VARCHAR(100) NOT NULL,          -- COD, VNPAY, CREDIT_CARD
    enabled BOOLEAN DEFAULT TRUE
);

CREATE TABLE payment_transactions (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    bill_id         BIGINT REFERENCES bills(id),
    method          VARCHAR(50),
    amount          DECIMAL(15,2),
    status          ENUM('PENDING','SUCCESS','FAILED','REFUNDED'),
    vnpay_txn_ref   VARCHAR(100),          -- VNPay transaction reference
    vnpay_response  TEXT,                  -- Full VNPay response JSON
    paid_at         TIMESTAMP,
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE shipping_methods (
    id          INT PRIMARY KEY AUTO_INCREMENT,
    name        VARCHAR(100) NOT NULL,     -- Giao hàng tiêu chuẩn, Nhanh, Hỏa tốc
    fee         DECIMAL(10,2) DEFAULT 0,
    description TEXT,
    enabled     BOOLEAN DEFAULT TRUE
);
```

---

## 3. API Endpoints

### Cart
```
GET    /api/carts                    ← Giỏ hàng hiện tại
POST   /api/carts/items              ← Thêm sách vào giỏ
PUT    /api/carts/items/{id}         ← Cập nhật số lượng
DELETE /api/carts/items/{id}         ← Xóa item
DELETE /api/carts                    ← Xóa toàn bộ giỏ
```

### Bill (Order)
```
POST   /api/bills                    ← Tạo đơn hàng
GET    /api/bills/me                 ← Đơn hàng của tôi
GET    /api/bills/{id}               ← Chi tiết đơn hàng
PUT    /api/bills/{id}/cancel        ← Hủy đơn (chỉ status PENDING)

# Admin
GET    /api/admin/bills              ← Tất cả đơn hàng
PUT    /api/admin/bills/{id}/status  ← Cập nhật trạng thái
```

### Payment (VNPay)
```
POST   /api/payment/vnpay/create     ← Tạo URL thanh toán VNPay
GET    /vnpay/return                 ← Redirect callback (browser)
GET    /vnpay/ipn                    ← IPN callback (VNPay server)
```

---

## 4. Luồng tạo đơn hàng

```
POST /api/bills
Body: {
  shippingAddressId: 5,
  shippingMethodId: 1,
  paymentMethodId: 2,    // VNPAY
  eventCode: "SALE2024", // khuyến mãi (optional)
  note: "Giao giờ hành chính"
}

Order Service:
  1. Lấy giỏ hàng của user
  2. Gọi Book Service (internal REST): check stock mỗi item
  3. Gọi Event Service (internal REST): apply discount (nếu có eventCode)
  4. Gọi User Service (internal REST): lấy địa chỉ giao hàng
  5. Tạo Bill + BillBooks trong DB
  6. Gọi Book Service: deduct stock cho mỗi item
  7. Xóa giỏ hàng
  8. Publish Kafka "order.created"
  9. Nếu payment = VNPAY → trả về vnpay_url
     Nếu payment = COD → Bill status = CONFIRMED
```

---

## 5. Saga Pattern — Xử lý lỗi khi trừ stock

```
Order Service tạo Bill (status = STOCK_PENDING)
  │
  ├── Trừ stock Book 1 → OK
  ├── Trừ stock Book 2 → FAILED (hết hàng)
  │
  │   → Compensate: Hoàn lại stock Book 1
  │   → Bill status = CANCELLED
  └── Publish "order.failed" → Notification Service gửi email thông báo
```

---

## 6. Order State Machine

```
                     ┌─────────────────────────────────────┐
                     │           BILL STATUS               │
                     │                                     │
                     │  PENDING ──→ CONFIRMED ──→ SHIPPING │
                     │     │             │              │   │
                     │     ▼             ▼              ▼   │
                     │  CANCELLED    CANCELLED      COMPLETED│
                     └─────────────────────────────────────┘

PENDING    : Vừa tạo, chờ thanh toán (VNPay) hoặc chờ xác nhận (COD)
CONFIRMED  : Đã thanh toán/xác nhận, đang chuẩn bị hàng
SHIPPING   : Đang giao hàng
COMPLETED  : Đã giao hàng thành công (terminal)
CANCELLED  : Đã hủy (terminal) → stock được hoàn lại
```

---

## 7. Kafka Events Published

```
order.created          → Notification gửi email xác nhận
order.status.updated   → Notification gửi email + WebSocket push
order.cancelled        → Book Service hoàn lại stock + Notification
order.payment.completed → Notification gửi email thanh toán thành công
```

---

## 8. Dependencies (Feign Clients)

```java
@FeignClient(name = "book-service")
public interface BookServiceClient {
    @GetMapping("/api/internal/books/{id}/stock")
    BookStockResponse getStock(@PathVariable Long id);
    
    @PutMapping("/api/internal/books/{id}/stock")
    void updateStock(@PathVariable Long id, @RequestBody StockUpdateRequest req);
}

@FeignClient(name = "user-service")
public interface UserServiceClient {
    @GetMapping("/api/internal/addresses/{id}")
    AddressResponse getAddress(@PathVariable Long id);
}

@FeignClient(name = "event-service")
public interface EventServiceClient {
    @PostMapping("/api/internal/events/apply")
    DiscountResponse applyEvent(@RequestBody ApplyEventRequest req);
}
```

---

*← [06 - Book Service](./06-book-service.md) | [08 - Notification Service →](./08-notification-service.md)*
