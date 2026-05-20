# 09 — Event & Promotion Service

> Quản lý chương trình khuyến mãi, giảm giá và sự kiện.

---

## 1. Tổng quan

**Port**: `8085` | **Database**: `MySQL (event_db)`

Xử lý mọi logic khuyến mãi: flashsale, giảm giá theo danh mục, giảm theo mã code, tặng quà...

---

## 2. Database Schema (event_db)

```sql
CREATE TABLE events (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    name            VARCHAR(500) NOT NULL,
    code            VARCHAR(100) UNIQUE,        -- Mã khuyến mãi nhập tay
    description     TEXT,
    priority        INT DEFAULT 0,              -- Ưu tiên hiển thị (cao nhất ở banner)
    start_date      TIMESTAMP NOT NULL,
    end_date        TIMESTAMP NOT NULL,
    status          ENUM('ACTIVE','INACTIVE','SCHEDULED') DEFAULT 'INACTIVE',
    created_by      BIGINT,                     -- userId from JWT
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE event_rules (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    event_id        BIGINT REFERENCES events(id),
    type            VARCHAR(100),               -- MIN_ORDER_VALUE, MIN_QUANTITY...
    value           DECIMAL(15,2)
);

CREATE TABLE event_actions (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    event_id        BIGINT REFERENCES events(id),
    type            VARCHAR(100),               -- PERCENT_DISCOUNT, FIXED_DISCOUNT, FREE_SHIP
    value           DECIMAL(15,2),
    max_discount    DECIMAL(15,2)              -- Giảm tối đa (cho PERCENT_DISCOUNT)
);

CREATE TABLE event_targets (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    event_id        BIGINT REFERENCES events(id),
    type            VARCHAR(50),               -- ALL, CATEGORY, BOOK, USER_GROUP
    target_id       BIGINT                     -- categoryId, bookId...
);

CREATE TABLE event_images (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    event_id        BIGINT REFERENCES events(id),
    image_url       VARCHAR(1000) NOT NULL,
    is_banner       BOOLEAN DEFAULT FALSE
);

CREATE TABLE event_logs (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    event_id        BIGINT REFERENCES events(id),
    user_id         BIGINT,
    bill_id         BIGINT,
    discount_applied DECIMAL(15,2),
    applied_at      TIMESTAMP DEFAULT NOW()
);
```

---

## 3. API Endpoints

### Public
```
GET  /api/events/highest-priority   ← Banner event nổi bật nhất (active)
GET  /api/events                    ← Danh sách events đang active
GET  /api/events/{id}               ← Chi tiết event
```

### Internal (từ Order Service)
```
POST /api/internal/events/apply
Body: {
  eventCode: "SALE2024",
  userId: 42,
  items: [{ bookId: 1, quantity: 2, price: 100000 }],
  subtotal: 200000
}

Response: {
  valid: true,
  discountAmount: 30000,
  finalAmount: 170000,
  reason: "Giảm 15% đơn từ 150,000đ"
}
```

### Admin
```
POST   /api/events              ← Tạo event
PUT    /api/events/{id}         ← Cập nhật event
DELETE /api/events/{id}         ← Xóa event
PUT    /api/events/{id}/status  ← Kích hoạt/tắt
GET    /api/events/{id}/logs    ← Thống kê sử dụng
```

---

## 4. Logic tính discount

```java
@Service
public class EventApplyService {

    public DiscountResult apply(ApplyEventRequest request) {
        Event event = eventRepository.findByCode(request.getEventCode())
            .orElseThrow(() -> new EventNotFoundException());

        // 1. Kiểm tra event còn active và trong thời gian
        validateEventActive(event);

        // 2. Kiểm tra rules (đủ điều kiện chưa?)
        for (EventRule rule : event.getRules()) {
            switch (rule.getType()) {
                case "MIN_ORDER_VALUE":
                    if (request.getSubtotal().compareTo(rule.getValue()) < 0)
                        throw new RuleNotMetException("Đơn tối thiểu " + rule.getValue());
                    break;
                case "MIN_QUANTITY":
                    int totalQty = request.getItems().stream()
                        .mapToInt(OrderItemDto::getQuantity).sum();
                    if (totalQty < rule.getValue().intValue())
                        throw new RuleNotMetException("Cần mua tối thiểu " + (int)rule.getValue().doubleValue() + " sản phẩm");
                    break;
            }
        }

        // 3. Tính discount theo action
        BigDecimal discount = BigDecimal.ZERO;
        for (EventAction action : event.getActions()) {
            switch (action.getType()) {
                case "PERCENT_DISCOUNT":
                    BigDecimal calc = request.getSubtotal()
                        .multiply(action.getValue())
                        .divide(BigDecimal.valueOf(100));
                    discount = calc.min(action.getMaxDiscount()); // cap at max
                    break;
                case "FIXED_DISCOUNT":
                    discount = action.getValue();
                    break;
                case "FREE_SHIP":
                    discount = request.getShippingFee();
                    break;
            }
        }

        return DiscountResult.builder()
            .valid(true)
            .discountAmount(discount)
            .finalAmount(request.getSubtotal().subtract(discount))
            .build();
    }
}
```

---

*← [08 - Notification Service](./08-notification-service.md) | [10 - File Service →](./10-file-service.md)*
