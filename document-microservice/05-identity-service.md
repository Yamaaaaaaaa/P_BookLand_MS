# 05 — Identity Service

> Xác thực & phân quyền — Service đầu tiên cần triển khai.

---

## 1. Tổng quan

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

---

## 2. Database Schema

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

---

## 3. JWT Structure

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

---

## 4. API Endpoints

### POST /auth/register
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

### POST /auth/login
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

### POST /auth/introspect (Internal — dùng bởi API Gateway)
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

### POST /auth/google
```json
// Request
{
  "idToken": "google-id-token-from-frontend"
}
// → Verify với Google API → Tạo hoặc login user → Trả JWT
```

---

## 5. Kafka Events Published

```
Topic: user.registered
Payload: { userId, email, fullName, registeredAt }
Consumer: Notification Service → Gửi email chào mừng

Topic: auth.otp.requested (tương lai — forgot password)
Payload: { email, otp, expiresAt }
Consumer: Notification Service → Gửi OTP email
```

---

## 6. Dependencies (build.gradle)

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

*← [04 - API Gateway](./04-api-gateway.md) | [06 - Book Service →](./06-book-service.md)*
