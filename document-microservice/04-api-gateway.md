# 04 — API Gateway (Spring Cloud Gateway)

> Cổng vào duy nhất của toàn bộ hệ thống BookLand Microservice.

---

## 1. Vai trò & Trách nhiệm

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

---

## 2. Tech Stack

- **Spring Cloud Gateway** (reactive, non-blocking)
- **Spring Boot 3.x** (Java 17)
- **Redis**: Rate limiting, caching token validation
- **Resilience4j**: Circuit breaker

---

## 3. Cấu trúc project

```
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

---

## 4. Routing Configuration

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

---

## 5. Authentication Filter

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

---

## 6. CORS Configuration

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

---

## 7. Circuit Breaker (Resilience4j)

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

---

## 8. Rate Limiting

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

---

## 9. build.gradle cho API Gateway

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

*← [03 - Phân rã service](./03-service-decomposition.md) | [05 - Identity Service →](./05-identity-service.md)*
