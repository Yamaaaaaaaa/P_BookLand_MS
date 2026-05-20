# 06 — Book Service

> Quản lý catalog sách — Domain nghiệp vụ trung tâm của BookLand.

---

## 1. Tổng quan

**Port**: `8083` | **Database**: `MySQL (book_db)` | **Kafka**: Producer

Quản lý toàn bộ catalog: Sách, tác giả, danh mục, nhà xuất bản, series, nhà cung cấp, nhập kho, review.

---

## 2. Database Schema (book_db)

```sql
CREATE TABLE books (
    id            BIGINT PRIMARY KEY AUTO_INCREMENT,
    title         VARCHAR(500) NOT NULL,
    description   TEXT,
    price         DECIMAL(15,2) NOT NULL,
    stock         INT DEFAULT 0,
    cover_image   VARCHAR(1000),
    images        JSON,               -- ["url1", "url2"]
    isbn          VARCHAR(20),
    pages         INT,
    language      VARCHAR(50),
    weight        DECIMAL(5,2),
    publisher_id  BIGINT,
    author_id     BIGINT,
    category_id   BIGINT,
    serie_id      BIGINT,
    supplier_id   BIGINT,
    status        ENUM('ACTIVE','INACTIVE') DEFAULT 'ACTIVE',
    created_at    TIMESTAMP DEFAULT NOW(),
    updated_at    TIMESTAMP DEFAULT NOW() ON UPDATE NOW(),
    FOREIGN KEY (publisher_id) REFERENCES publishers(id),
    FOREIGN KEY (author_id) REFERENCES authors(id),
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE authors (
    id          BIGINT PRIMARY KEY AUTO_INCREMENT,
    name        VARCHAR(255) NOT NULL,
    bio         TEXT,
    avatar      VARCHAR(1000)
);

CREATE TABLE categories (
    id          INT PRIMARY KEY AUTO_INCREMENT,
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    parent_id   INT REFERENCES categories(id)
);

CREATE TABLE publishers (
    id      BIGINT PRIMARY KEY AUTO_INCREMENT,
    name    VARCHAR(255) NOT NULL,
    address TEXT
);

CREATE TABLE series (
    id          BIGINT PRIMARY KEY AUTO_INCREMENT,
    name        VARCHAR(255) NOT NULL,
    description TEXT
);

CREATE TABLE suppliers (
    id      BIGINT PRIMARY KEY AUTO_INCREMENT,
    name    VARCHAR(255) NOT NULL,
    email   VARCHAR(255),
    phone   VARCHAR(20),
    address TEXT
);

CREATE TABLE purchase_invoices (
    id           BIGINT PRIMARY KEY AUTO_INCREMENT,
    supplier_id  BIGINT REFERENCES suppliers(id),
    total_amount DECIMAL(15,2),
    note         TEXT,
    created_by   BIGINT,           -- userId from Identity Service
    created_at   TIMESTAMP DEFAULT NOW()
);

CREATE TABLE purchase_invoice_books (
    id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
    purchase_invoice_id BIGINT REFERENCES purchase_invoices(id),
    book_id             BIGINT REFERENCES books(id),
    quantity            INT NOT NULL,
    unit_price          DECIMAL(15,2)
);

CREATE TABLE book_comments (
    id          BIGINT PRIMARY KEY AUTO_INCREMENT,
    book_id     BIGINT REFERENCES books(id),
    user_id     BIGINT,               -- từ JWT header
    user_name   VARCHAR(255),         -- denormalized
    user_avatar VARCHAR(1000),        -- denormalized
    content     TEXT,
    rating      INT CHECK (rating BETWEEN 1 AND 5),
    created_at  TIMESTAMP DEFAULT NOW()
);
```

---

## 3. API Endpoints

### Public APIs (không cần auth)
```
GET  /api/books                  ← Danh sách sách (filter, paginate, sort)
     ?page=0&size=20
     &category=1
     &author=2
     &minPrice=50000&maxPrice=500000
     &sort=price,asc
     
GET  /api/books/{id}             ← Chi tiết sách
GET  /api/books/best-sellers     ← Top bán chạy
GET  /api/books/{id}/comments    ← Review sách

GET  /api/categories             ← Danh mục
GET  /api/categories/{id}
GET  /api/authors                ← Tác giả
GET  /api/authors/{id}
GET  /api/publishers             ← Nhà xuất bản
GET  /api/series                 ← Series
```

### Authenticated APIs
```
POST   /api/books/{id}/comments  ← Đánh giá (cần mua sách trước)
DELETE /api/books/{id}/comments/{commentId}  ← Xóa (owner hoặc ADMIN)
```

### Admin APIs
```
POST   /api/books                ← Thêm sách
PUT    /api/books/{id}           ← Cập nhật sách
DELETE /api/books/{id}           ← Xóa sách (soft delete)

POST   /api/authors
PUT    /api/authors/{id}
DELETE /api/authors/{id}

POST   /api/categories
PUT    /api/categories/{id}
DELETE /api/categories/{id}

POST   /api/purchase-invoices    ← Nhập kho (tăng stock)
GET    /api/purchase-invoices    ← Lịch sử nhập kho
```

### Internal APIs (dùng bởi Order Service)
```
GET  /api/internal/books/{id}/stock   ← Kiểm tra tồn kho
PUT  /api/internal/books/{id}/stock   ← Cập nhật tồn kho
     Body: { delta: -2, reason: "ORDER_PLACED", orderId: "123" }
```

---

## 4. Kafka Events Published

```java
// Sau khi thêm sách mới
kafkaTemplate.send("book.created", bookId, BookCreatedEvent.builder()
    .bookId(book.getId())
    .title(book.getTitle())
    .authorName(book.getAuthor().getName())
    .categoryName(book.getCategory().getName())
    .price(book.getPrice())
    .stock(book.getStock())
    .imageUrl(book.getCoverImage())
    .build()
);

// Sau khi cập nhật stock
kafkaTemplate.send("book.stock.updated", bookId, BookStockUpdatedEvent.builder()
    .bookId(book.getId())
    .oldStock(oldStock)
    .newStock(book.getStock())
    .reason(reason)  // "ORDER_PLACED", "ORDER_CANCELLED", "PURCHASE_INVOICE"
    .build()
);
```

---

## 5. Xử lý Stock Thread-safe

```java
@Service
@Transactional
public class BookStockService {

    // Dùng Optimistic Locking để tránh race condition
    @Version
    private Integer version;  // Trong Book entity

    public void deductStock(Long bookId, int quantity, String reason) {
        Book book = bookRepository.findById(bookId)
            .orElseThrow(() -> new NotFoundException("Book not found"));

        if (book.getStock() < quantity) {
            throw new InsufficientStockException(
                "Not enough stock for book: " + bookId);
        }

        int oldStock = book.getStock();
        book.setStock(book.getStock() - quantity);
        bookRepository.save(book);

        // Publish Kafka event
        eventPublisher.publishStockUpdated(book, oldStock, reason);
    }
}
```

---

*← [05 - Identity Service](./05-identity-service.md) | [07 - Order Service →](./07-order-service.md)*
