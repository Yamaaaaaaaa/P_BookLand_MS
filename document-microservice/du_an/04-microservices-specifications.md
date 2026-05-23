# 04 — Đặc tả Chi tiết các Dịch vụ (Microservices Specifications)

> Tài liệu này là **đặc tả kỹ thuật tổng hợp toàn bộ các Microservices** trong hệ thống **BookLand Microservice**. Nó cung cấp kiến trúc, schema database, cấu hình định tuyến, API endpoint, cấu trúc message broker (Kafka) và cấu trúc mã nguồn của từng dịch vụ cụ thể.

---

## 📌 Mục lục Liên kết nhanh
- [1. API Gateway (Spring Cloud Gateway)](#1-api-gateway-spring-cloud-gateway)
- [2. Identity Service (Xác thực & Phân quyền)](#2-identity-service-xác-thực--phân-quyền)
- [3. Book Service (Catalog sách & Tác giả)](#3-book-service-catalog-sách--tác-giả)
- [4. Order Service & Payment (Giỏ hàng, Đơn hàng & VNPay)](#4-order-service--payment-giỏ-hàng-đơn-hàng--vnpay)
- [5. Notification Service (MongoDB, WebSocket & Email)](#5-notification-service-mongodb-websocket--email)
- [6. Event & Promotion Service (Khuyến mãi & Banner sự kiện)](#6-event--promotion-service-khuyến-mãi--banner-sự-kiện)
- [7. File Service (Quản lý Upload hình ảnh qua MinIO/S3)](#7-file-service-quản-lý-upload-hình-ảnh-qua-minios3)
- [8. Search Service (Tìm kiếm nâng cao qua Elasticsearch)](#8-search-service-tìm-kiếm-nâng-cao-qua-elasticsearch)

---

## 1. API Gateway (Spring Cloud Gateway)

Cổng vào duy nhất của toàn bộ hệ thống BookLand Microservice.

### 1.1 Vai trò & Trách nhiệm

```
CLIENT
  │
  ▼ (tất cả request đi qua đây)
┌──────────────────────────────────────────┐
│            API GATEWAY :8080             │
│                                          │
│  1. Authentication Filter (JWT Verify)  │
│  2. Route → đúng microservice           │
│  3. Rate Limiting (Redis)               │
│  4. Request/Response Logging            │
│  5. CORS Handling                       │
│  6. Circuit Breaker (Resilience4j)      │
└──────────────────────────────────────────┘
  │
  ├── → Identity Service  :8081
  ├── → User Service      :8082
  ├── → Book Service      :8083
  ├── → Order Service     :8084
  ├── → Event Service     :8085
  ├── → Notification Svc  :8086
  ├── → File Service      :8087
  └── → Search Service    :8088
```

### 1.2 Tech Stack
- **Spring Cloud Gateway** (reactive, non-blocking)
- **Spring Boot 3.x** (Java 17)
- **Redis**: Rate limiting, caching token validation
- **Resilience4j**: Circuit breaker

### 1.3 Cấu trúc project
```text
api-gateway/
├── src/main/java/com/bookland/gateway/
│   ├── GatewayApplication.java
│   ├── config/
│   │   ├── GatewayConfig.java        ← Route definitions
│   │   └── SecurityConfig.java       ← CORS, security
│   ├── filter/
│   │   ├── AuthenticationFilter.java ← JWT validation
│   │   ├── LoggingFilter.java        ← Request/response logging
│   │   └── RateLimitFilter.java      ← Rate limiting
│   └── exception/
│       └── GlobalExceptionHandler.java
├── src/main/resources/
│   └── application.yml
└── build.gradle
```

### 1.4 Routing Configuration
```yaml
# application.yml
spring:
  cloud:
    gateway:
      routes:
        # Identity Service — không cần auth
        - id: identity-service
          uri: http://identity-service:8081
          predicates:
            - Path=/auth/**, /api/roles/**
          filters:
            - name: RequestRateLimiter
              args:
                redis-rate-limiter.replenishRate: 10
                redis-rate-limiter.burstCapacity: 20

        # User Service — cần auth
        - id: user-service
          uri: http://user-service:8082
          predicates:
            - Path=/api/users/**, /api/addresses/**, /api/wishlists/**
          filters:
            - AuthenticationFilter

        # Book Service — GET public, còn lại cần auth
        - id: book-service
          uri: http://book-service:8083
          predicates:
            - Path=/api/books/**, /api/authors/**, /api/categories/**, /api/series/**, /api/publishers/**
          filters:
            - AuthenticationFilter  # Filter xử lý logic public/private

        # Order Service — cần auth
        - id: order-service
          uri: http://order-service:8084
          predicates:
            - Path=/api/bills/**, /api/carts/**, /vnpay/**, /api/payment-methods/**, /api/shipping-methods/**
          filters:
            - AuthenticationFilter

        # Event Service
        - id: event-service
          uri: http://event-service:8085
          predicates:
            - Path=/api/events/**
          filters:
            - AuthenticationFilter

        # Notification Service
        - id: notification-service
          uri: http://notification-service:8086
          predicates:
            - Path=/api/notifications/**, /ws/**
          filters:
            - AuthenticationFilter

        # File Service
        - id: file-service
          uri: http://file-service:8087
          predicates:
            - Path=/api/files/**
          filters:
            - AuthenticationFilter

        # Search Service — public
        - id: search-service
          uri: http://search-service:8088
          predicates:
            - Path=/api/search/**
```

### 1.5 Authentication Filter
```java
@Component
public class AuthenticationFilter implements GatewayFilter, Ordered {

    // Các path không cần xác thực
    private final List<String> PUBLIC_PATHS = List.of(
        "/auth/login", "/auth/register", "/auth/refresh",
        "/auth/google", "/vnpay/return", "/vnpay/ipn",
        "/api/books", "/api/categories", "/api/authors",
        "/api/search"
    );

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String path = exchange.getRequest().getURI().getPath();
        String method = exchange.getRequest().getMethod().name();

        // Public paths → bỏ qua auth
        if (isPublicPath(path, method)) {
            return chain.filter(exchange);
        }

        // Lấy token từ header
        String authHeader = exchange.getRequest().getHeaders()
            .getFirst(HttpHeaders.AUTHORIZATION);

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return unauthorized(exchange);
        }

        String token = authHeader.substring(7);

        // Gọi Identity Service để validate token
        return identityClient.introspect(token)
            .flatMap(response -> {
                if (!response.isValid()) {
                    return unauthorized(exchange);
                }

                // Forward user info trong header cho downstream services
                ServerHttpRequest mutatedRequest = exchange.getRequest()
                    .mutate()
                    .header("X-User-Id", response.getUserId())
                    .header("X-User-Roles", String.join(",", response.getRoles()))
                    .header("X-User-Email", response.getEmail())
                    .build();

                return chain.filter(exchange.mutate()
                    .request(mutatedRequest).build());
            });
    }
}
```
> **Tối ưu**: Có thể validate JWT **locally** tại Gateway (dùng public key) thay vì gọi Identity Service mỗi request → giảm latency.

### 1.6 CORS Configuration
```java
@Bean
public CorsWebFilter corsWebFilter() {
    CorsConfiguration config = new CorsConfiguration();
    config.setAllowedOrigins(List.of(
        "http://localhost:5173",      // Dev FE
        "https://bookland.app"         // Production FE
    ));
    config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
    config.setAllowedHeaders(List.of("*"));
    config.setAllowCredentials(true);

    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", config);
    return new CorsWebFilter(source);
}
```

### 1.7 Circuit Breaker (Resilience4j)
```yaml
resilience4j:
  circuitbreaker:
    instances:
      book-service:
        slidingWindowSize: 10
        minimumNumberOfCalls: 5
        permittedNumberOfCallsInHalfOpenState: 3
        waitDurationInOpenState: 10s
        failureRateThreshold: 50
```
Khi Book Service down, Gateway trả về **fallback response** thay vì lỗi 500:
```java
.filters(f -> f
    .circuitBreaker(c -> c
        .setName("book-service")
        .setFallbackUri("forward:/fallback/book"))
)
```

### 1.8 Rate Limiting
```yaml
# Redis-based rate limiter
spring:
  data:
    redis:
      host: bookland-redis
      port: 6379

# Giới hạn: 10 request/giây/IP
# Burst: 20 request
```

### 1.9 build.gradle cho API Gateway
```groovy
dependencies {
    implementation 'org.springframework.cloud:spring-cloud-starter-gateway'
    implementation 'org.springframework.boot:spring-boot-starter-data-redis-reactive'
    implementation 'org.springframework.cloud:spring-cloud-starter-circuitbreaker-reactor-resilience4j'
    implementation 'io.github.resilience4j:resilience4j-spring-boot3'
    compileOnly 'org.projectlombok:lombok'
    annotationProcessor 'org.projectlombok:lombok'
}
```

---

## 2. Identity Service (Xác thực & Phân quyền)

Xác thực & phân quyền — Service đầu tiên cần triển khai.

### 2.1 Tổng quan
**Port**: `8081` | **Database**: `MySQL (identity_db)` | **Cache**: Redis

```
Client → POST /auth/login
       ↓
Identity Service
  ├── Validate credentials (bcrypt)
  ├── Generate JWT (access_token: 1h + refresh_token: 7d)
  └── Return tokens
       ↓
Client lưu token → gửi trong Authorization header mọi request
       ↓
API Gateway → POST /auth/introspect {token}
            ↓
Identity Service
  ├── Verify JWT signature
  ├── Check token chưa bị blacklist (Redis)
  └── Return { valid, userId, roles, email }
```

### 2.2 Database Schema
```sql
-- identity_db

CREATE TABLE users (
    id          BIGINT PRIMARY KEY AUTO_INCREMENT,
    email       VARCHAR(255) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,  -- BCrypt
    enabled     BOOLEAN DEFAULT TRUE,
    dob         DATE,
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW() ON UPDATE NOW()
);

CREATE TABLE roles (
    id          INT PRIMARY KEY AUTO_INCREMENT,
    name        VARCHAR(100) NOT NULL UNIQUE,  -- USER, ADMIN, MANAGER...
    description TEXT
);

CREATE TABLE permissions (
    id          INT PRIMARY KEY AUTO_INCREMENT,
    name        VARCHAR(100) NOT NULL UNIQUE,
    description TEXT
);

CREATE TABLE user_roles (
    user_id     BIGINT REFERENCES users(id),
    role_id     INT REFERENCES roles(id),
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE role_permissions (
    role_id        INT REFERENCES roles(id),
    permission_id  INT REFERENCES permissions(id),
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE invalidated_tokens (
    id          VARCHAR(255) PRIMARY KEY,  -- JWT ID (jti claim)
    expiry_time TIMESTAMP NOT NULL
);
```

### 2.3 JWT Structure
```json
// Access Token Payload
{
  "jti": "uuid-v4",               // JWT ID (dùng cho blacklist)
  "sub": "user123@gmail.com",     // Subject (email)
  "userId": "42",                 // Custom claim
  "roles": ["USER"],              // Roles
  "scope": "USER",                // Spring Security scope
  "iss": "bookland.com",          // Issuer
  "iat": 1715000000,              // Issued at
  "exp": 1715003600               // Expiry (1 hour)
}
```

### 2.4 API Endpoints

#### POST /auth/register
```json
// Request
{
  "email": "user@gmail.com",
  "password": "SecurePass123!",
  "fullName": "Nguyễn Văn A",
  "dob": "2000-01-15"
}

// Response 201
{
  "code": 1000,
  "message": "Đăng ký thành công",
  "result": {
    "userId": 42,
    "email": "user@gmail.com"
  }
}
```

#### POST /auth/login
```json
// Request
{
  "email": "user@gmail.com",
  "password": "SecurePass123!"
}

// Response 200
{
  "code": 1000,
  "result": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "expiresIn": 3600
  }
}
```

#### POST /auth/introspect (Internal — dùng bởi API Gateway)
```json
// Request
{
  "token": "eyJhbGc..."
}

// Response 200
{
  "valid": true,
  "userId": "42",
  "email": "user@gmail.com",
  "roles": ["USER"],
  "expiresAt": "2026-05-14T01:00:00Z"
}
```

#### POST /auth/google
```json
// Request
{
  "idToken": "google-id-token-from-frontend"
}
// → Verify với Google API → Tạo hoặc login user → Trả JWT
```

### 2.5 Kafka Events Published
```text
Topic: user.registered
Payload: { userId, email, fullName, registeredAt }
Consumer: Notification Service → Gửi email chào mừng

Topic: auth.otp.requested (tương lai — forgot password)
Payload: { email, otp, expiresAt }
Consumer: Notification Service → Gửi OTP email
```

### 2.6 Dependencies (build.gradle)
```groovy
dependencies {
    implementation 'org.springframework.boot:spring-boot-starter-web'
    implementation 'org.springframework.boot:spring-boot-starter-data-jpa'
    implementation 'org.springframework.boot:spring-boot-starter-security'
    implementation 'org.springframework.boot:spring-boot-starter-oauth2-resource-server'  // JWT
    implementation 'org.springframework.boot:spring-boot-starter-oauth2-client'           // Google
    implementation 'org.springframework.boot:spring-boot-starter-data-redis'
    implementation 'org.springframework.boot:spring-boot-starter-validation'
    implementation 'org.springframework.kafka:spring-kafka'
    runtimeOnly 'com.mysql:mysql-connector-j'
    compileOnly 'org.projectlombok:lombok'
    annotationProcessor 'org.projectlombok:lombok'
    implementation 'org.mapstruct:mapstruct:1.5.5.Final'
    annotationProcessor 'org.mapstruct:mapstruct-processor:1.5.5.Final'
    implementation 'org.springdoc:springdoc-openapi-starter-webmvc-ui:2.8.15'
}
```

---

## 3. Book Service (Catalog sách & Tác giả)

Quản lý catalog sách — Domain nghiệp vụ trung tâm của BookLand.

### 3.1 Tổng quan
**Port**: `8083` | **Database**: `MySQL (book_db)` | **Kafka**: Producer

Quản lý toàn bộ catalog: Sách, tác giả, danh mục, nhà xuất bản, series, nhà cung cấp, nhập kho, review.

### 3.2 Database Schema (book_db)
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

### 3.3 API Endpoints

#### Public APIs (không cần auth)
```text
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

#### Authenticated APIs
```text
POST   /api/books/{id}/comments  ← Đánh giá (cần mua sách trước)
DELETE /api/books/{id}/comments/{commentId}  ← Xóa (owner hoặc ADMIN)
```

#### Admin APIs
```text
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

#### Internal APIs (dùng bởi Order Service)
```text
GET  /api/internal/books/{id}/stock   ← Kiểm tra tồn kho
PUT  /api/internal/books/{id}/stock   ← Cập nhật tồn kho
     Body: { delta: -2, reason: "ORDER_PLACED", orderId: "123" }
```

### 3.4 Kafka Events Published
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

### 3.5 Xử lý Stock Thread-safe
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

## 4. Order Service & Payment (Giỏ hàng, Đơn hàng & VNPay)

Quản lý giỏ hàng, đơn hàng và thanh toán VNPay.

### 4.1 Tổng quan
**Port**: `8084` | **Database**: `MySQL (order_db)` | **Kafka**: Producer + Consumer

Đây là service **phức tạp nhất** vì phụ thuộc nhiều service khác và xử lý distributed transaction.

### 4.2 Database Schema (order_db)
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
    name    VARCHAR(100) NOT NULL,     -- Giao hàng tiêu chuẩn, Nhanh, Hỏa tốc
    fee         DECIMAL(10,2) DEFAULT 0,
    description TEXT,
    enabled     BOOLEAN DEFAULT TRUE
);
```

### 4.3 API Endpoints

#### Cart
```text
GET    /api/carts                    ← Giỏ hàng hiện tại
POST   /api/carts/items              ← Thêm sách vào giỏ
PUT    /api/carts/items/{id}         ← Cập nhật số lượng
DELETE /api/carts/items/{id}         ← Xóa item
DELETE /api/carts                    ← Xóa toàn bộ giỏ
```

#### Bill (Order)
```text
POST   /api/bills                    ← Tạo đơn hàng
GET    /api/bills/me                 ← Đơn hàng của tôi
GET    /api/bills/{id}               ← Chi tiết đơn hàng
PUT    /api/bills/{id}/cancel        ← Hủy đơn (chỉ status PENDING)

# Admin
GET    /api/admin/bills              ← Tất cả đơn hàng
PUT    /api/admin/bills/{id}/status  ← Cập nhật trạng thái
```

#### Payment (VNPay)
```text
POST   /api/payment/vnpay/create     ← Tạo URL thanh toán VNPay
GET    /vnpay/return                 ← Redirect callback (browser)
GET    /vnpay/ipn                    ← IPN callback (VNPay server)
```

### 4.4 Luồng tạo đơn hàng
```text
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

### 4.5 Saga Pattern — Xử lý lỗi khi trừ stock
```text
Order Service tạo Bill (status = STOCK_PENDING)
  │
  ├── Trừ stock Book 1 → OK
  ├── Trừ stock Book 2 → FAILED (hết hàng)
  │
  │   → Compensate: Hoàn lại stock Book 1
  │   → Bill status = CANCELLED
  └── Publish "order.failed" → Notification Service gửi email thông báo
```

### 4.6 Order State Machine
```text
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

### 4.7 Kafka Events Published
```text
order.created          → Notification gửi email xác nhận
order.status.updated   → Notification gửi email + WebSocket push
order.cancelled        → Book Service hoàn lại stock + Notification
order.payment.completed → Notification gửi email thanh toán thành công
```

### 4.8 Dependencies (Feign Clients)
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

## 5. Notification Service (MongoDB, WebSocket & Email)

Xử lý mọi loại thông báo: Email, WebSocket push, và Chat.

### 5.1 Tổng quan
**Port**: `8086` | **Database**: `MongoDB (notification_db)` | **Kafka**: Consumer

Đây là service **pure consumer** — không gọi API của service nào, chỉ nhận Kafka events và xử lý.

### 5.2 Tại sao MongoDB?
- Notification có schema linh hoạt (payload khác nhau theo loại)
- Không cần ACID transaction phức tạp
- Read-heavy (user đọc notification danh sách)
- Dễ TTL (tự xóa notification cũ sau 30 ngày)

### 5.3 MongoDB Collections

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

### 5.4 Kafka Consumers
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

### 5.5 WebSocket (STOMP)
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

### 5.6 API Endpoints
```text
GET  /api/notifications          ← Danh sách notification của tôi
     ?page=0&size=20&read=false

PUT  /api/notifications/{id}/read    ← Đánh dấu đã đọc 1 thông báo
PUT  /api/notifications/read-all     ← Đánh dấu đọc tất cả
GET  /api/notifications/unread-count ← Số thông báo chưa đọc

GET  /api/chat/messages          ← Lịch sử chat với admin
POST /api/chat/messages          ← Gửi tin nhắn mới (qua HTTP, sync về DB)
```

### 5.7 Email Templates (Thymeleaf)
```text
templates/
├── order-confirmation.html     ← Email xác nhận đơn hàng
├── order-status-update.html    ← Email cập nhật trạng thái
├── payment-success.html        ← Email thanh toán thành công
├── welcome.html                ← Email chào mừng đăng ký
└── otp.html                    ← Email OTP (tương lai)
```

---

## 6. Event & Promotion Service (Khuyến mãi & Banner sự kiện)

Quản lý chương trình khuyến mãi, giảm giá và sự kiện.

### 6.1 Tổng quan
**Port**: `8085` | **Database**: `MySQL (event_db)`

Xử lý mọi logic khuyến mãi: flashsale, giảm giá theo danh mục, giảm theo mã code, tặng quà...

### 6.2 Database Schema (event_db)
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

### 6.3 API Endpoints

#### Public
```text
GET  /api/events/highest-priority   ← Banner event nổi bật nhất (active)
GET  /api/events                    ← Danh sách events đang active
GET  /api/events/{id}               ← Chi tiết event
```

#### Internal (từ Order Service)
```text
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

#### Admin
```text
POST   /api/events              ← Tạo event
PUT    /api/events/{id}         ← Cập nhật event
DELETE /api/events/{id}         ← Xóa event
PUT    /api/events/{id}/status  ← Kích hoạt/tắt
GET    /api/events/{id}/logs    ← Thống kê sử dụng
```

### 6.4 Logic tính discount
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

## 7. File Service (Quản lý Upload hình ảnh qua MinIO/S3)

Upload và quản lý file media (ảnh sách, avatar, banner sự kiện).

### 7.1 Tổng quan
**Port**: `8087` | **Storage**: `MinIO (dev/staging)` hoặc `Supabase/AWS S3 (production)`

Stateless service — không có database, chỉ tương tác với object storage.

### 7.2 Strategy

| Môi trường (Environment) | Storage Backend |
| :--- | :--- |
| **Development** | MinIO (self-hosted Docker) |
| **Staging** | MinIO hoặc Supabase Storage |
| **Production** | AWS S3 hoặc Supabase Storage |

MinIO tương thích 100% với AWS S3 API → dễ switch sang S3 production.

### 7.3 API Endpoints

#### Upload
```text
POST /api/files/upload
Content-Type: multipart/form-data
Body: file (binary), bucket: "books|avatars|events"

Response 201:
{
  "fileId": "uuid-v4",
  "fileName": "book-cover-123.webp",
  "fileUrl": "http://localhost:9000/books/book-cover-123.webp",
  "size": 245678,
  "mimeType": "image/webp"
}
```

#### Upload Multiple
```text
POST /api/files/upload-multiple
Content-Type: multipart/form-data
Body: files[] (multiple)

Response 201: [ FileResponse, FileResponse, ... ]
```

#### Delete
```text
DELETE /api/files/{fileId}
Response 204: No Content
```

#### File Info
```text
GET /api/files/{fileId}/info
Response 200: { fileId, fileName, fileUrl, size, mimeType, uploadedAt }
```

### 7.4 Xử lý upload
```java
@Service
@RequiredArgsConstructor
public class FileService {

    private final MinioClient minioClient;

    public FileResponse upload(MultipartFile file, String bucket) {
        // 1. Validate file type
        validateFileType(file);

        // 2. Generate unique filename
        String extension = getExtension(file.getOriginalFilename());
        String fileName = UUID.randomUUID() + "." + extension;

        // 3. Convert to WebP (tối ưu dung lượng)
        InputStream processedStream = imageProcessor.convertToWebP(file.getInputStream());

        // 4. Upload lên MinIO
        minioClient.putObject(
            PutObjectArgs.builder()
                .bucket(bucket)
                .object(fileName)
                .stream(processedStream, processedStream.available(), -1)
                .contentType("image/webp")
                .build()
        );

        // 5. Trả về public URL
        String publicUrl = minioBaseUrl + "/" + bucket + "/" + fileName;
        return FileResponse.builder()
            .fileId(UUID.randomUUID().toString())
            .fileName(fileName)
            .fileUrl(publicUrl)
            .build();
    }
}
```

### 7.5 Docker MinIO Setup
```yaml
minio:
  image: minio/minio:latest
  ports:
    - "9000:9000"    # API (S3-compatible)
    - "9001:9001"    # Web Console
  environment:
    MINIO_ROOT_USER: bookland
    MINIO_ROOT_PASSWORD: bookland123
  command: server /data --console-address ":9001"
  volumes:
    - minio_data:/data
```
**MinIO Console**: http://localhost:9001
- Tạo buckets: `books`, `avatars`, `events`, `misc`
- Set bucket policy: Public read

### 7.6 Migration từ Supabase
Dự án hiện đang dùng **Supabase Storage** (`SupabaseStorageService.java`).

- **Option 1**: Giữ Supabase — Chỉ wrap lại trong File Service (dễ nhất)
  ```java
  // File Service gọi Supabase API thay vì MinIO
  // Không cần thay đổi logic upload hiện tại
  ```
- **Option 2**: Chuyển sang MinIO — Self-hosted, kiểm soát hoàn toàn

Khuyến nghị: **Option 1** trước (nhanh hơn), sau đó migrate sang MinIO khi cần.

---

## 8. Search Service (Tìm kiếm nâng cao qua Elasticsearch)

Tìm kiếm nâng cao cho sách — Full-text, filter, autocomplete.

### 8.1 Tổng quan
**Port**: `8088` | **Database**: `Elasticsearch 8.x` | **Kafka**: Consumer

Service này **không có MySQL** — chỉ Elasticsearch làm data store và Kafka để nhận updates từ Book Service.

### 8.2 Elasticsearch Index Schema
```json
PUT /bookland-books
{
  "settings": {
    "number_of_shards": 1,
    "number_of_replicas": 0,
    "analysis": {
      "analyzer": {
        "vietnamese_analyzer": {
          "type": "custom",
          "tokenizer": "standard",
          "filter": ["lowercase", "asciifolding"]
        }
      }
    }
  },
  "mappings": {
    "properties": {
      "bookId":       { "type": "keyword" },
      "title":        { "type": "text", "analyzer": "vietnamese_analyzer", "boost": 3 },
      "description":  { "type": "text", "analyzer": "vietnamese_analyzer" },
      "authorName":   { "type": "text", "analyzer": "vietnamese_analyzer", "boost": 2 },
      "categoryName": { "type": "keyword" },
      "categoryId":   { "type": "integer" },
      "publisherName":{ "type": "text" },
      "price":        { "type": "double" },
      "stock":        { "type": "integer" },
      "rating":       { "type": "float" },
      "soldCount":    { "type": "integer" },
      "coverImage":   { "type": "keyword", "index": false },
      "status":       { "type": "keyword" },
      "createdAt":    { "type": "date" }
    }
  }
}
```

### 8.3 Kafka Consumer
```java
@KafkaListener(topics = "book.created", groupId = "search-service")
public void onBookCreated(BookCreatedEvent event) {
    BookDocument doc = BookDocument.builder()
        .bookId(event.getBookId().toString())
        .title(event.getTitle())
        .authorName(event.getAuthorName())
        .categoryName(event.getCategoryName())
        .price(event.getPrice())
        .stock(event.getStock())
        .coverImage(event.getCoverImage())
        .status("ACTIVE")
        .createdAt(event.getCreatedAt())
        .build();
    bookSearchRepository.save(doc);
}

@KafkaListener(topics = "book.stock.updated", groupId = "search-service")
public void onStockUpdated(BookStockUpdatedEvent event) {
    // Chỉ update field stock, không overwrite toàn bộ document
    bookSearchRepository.updateStock(event.getBookId().toString(), event.getNewStock());
}

@KafkaListener(topics = "book.deleted", groupId = "search-service")
public void onBookDeleted(BookDeletedEvent event) {
    bookSearchRepository.deleteById(event.getBookId().toString());
}
```

### 8.4 API Endpoints

#### Full-text Search
```text
GET /api/search/books
    ?q=harry potter           ← Full-text query
    &category=fantasy         ← Filter theo category
    &authorId=5               ← Filter theo tác giả
    &minPrice=50000
    &maxPrice=500000
    &inStock=true             ← Chỉ sách còn hàng
    &sort=price,asc | rating,desc | createdAt,desc
    &page=0&size=20

Response:
{
  "total": 245,
  "page": 0,
  "size": 20,
  "books": [
    {
      "bookId": "1",
      "title": "Harry Potter và Hòn Đá Phù Thủy",
      "authorName": "J.K. Rowling",
      "price": 120000,
      "stock": 50,
      "rating": 4.8,
      "coverImage": "https://..."
    }
  ],
  "facets": {
    "categories": [
      { "name": "Fantasy", "count": 45 },
      { "name": "Fiction", "count": 30 }
    ],
    "priceRanges": [...]
  }
}
```

#### Autocomplete
```text
GET /api/search/books/suggest?q=harr

Response:
{
  "suggestions": [
    "Harry Potter",
    "Harry Houdini",
    "Harvard Business Review"
  ]
}
```

#### Autocomplete
```text
GET /api/search/books/trending?limit=10

← Dựa trên soldCount (cập nhật từ Kafka khi order completed)
```

### 8.5 Search Service Repository
```java
@Repository
public interface BookSearchRepository
    extends ElasticsearchRepository<BookDocument, String> {

    // Spring Data Elasticsearch tự generate query
    List<BookDocument> findByCategoryNameAndStockGreaterThan(
        String categoryName, int stock);

    // Custom query cho full-text
    @Query("""
        {
          "bool": {
            "must": [
              {
                "multi_match": {
                  "query": "?0",
                  "fields": ["title^3", "authorName^2", "description"],
                  "fuzziness": "AUTO"
                }
              }
            ],
            "filter": [
              { "range": { "price": { "gte": ?1, "lte": ?2 } } },
              { "term": { "status": "ACTIVE" } }
            ]
          }
        }
        """)
    Page<BookDocument> searchBooks(String query, double minPrice, double maxPrice,
                                    Pageable pageable);
}
```

### 8.6 Initial Data Sync
Khi dựng Search Service lần đầu, cần sync toàn bộ data từ Book Service:
```java
@Component
@Slf4j
public class InitialIndexSync implements ApplicationRunner {

    @Override
    public void run(ApplicationArguments args) {
        if (bookSearchRepository.count() == 0) {
            log.info("Elasticsearch index empty — starting initial sync...");

            // Gọi Book Service để lấy tất cả sách
            List<BookDto> allBooks = bookServiceClient.getAllBooks();
            List<BookDocument> docs = allBooks.stream()
                .map(this::toDocument)
                .collect(toList());

            bookSearchRepository.saveAll(docs);
            log.info("Synced {} books to Elasticsearch", docs.size());
        }
    }
}
```

---

*← [03 - Phân rã service](./03-service-decomposition.md) | [12 - Giao tiếp](./12-communication.md) →*
