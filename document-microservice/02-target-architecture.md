# 02 — Kiến trúc Microservice mục tiêu

> Mô tả tầm nhìn kiến trúc BookLand Microservice, lấy cảm hứng từ hệ thống **Bookteria**.

---

## 1. Sơ đồ kiến trúc tổng thể

```
                        ┌────────────────────────────────────┐
                        │           CLIENT LAYER             │
                        │                                    │
                   ┌────┤  BookLand Web (React + Vite + TS)  │
                   │    │  BookLand Mobile (React Native +   │
                   │    │  Expo)                             │
                   │    └────────────────────────────────────┘
                   │
                   ▼  HTTPS / WSS
        ┌──────────────────────────────────────────────────────┐
        │              API GATEWAY                             │
        │         (Spring Cloud Gateway)                       │
        │                                                      │
        │  ┌─────────────┐  ┌──────────────┐  ┌───────────┐  │
        │  │ JWT Filter  │  │ Rate Limiter │  │  Routing  │  │
        │  └─────────────┘  └──────────────┘  └───────────┘  │
        └──────┬──────┬──────┬──────┬──────┬──────┬──────────┘
               │      │      │      │      │      │
               ▼      ▼      ▼      ▼      ▼      ▼
           ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
           │ ID   │ │ USER │ │ BOOK │ │ORDER │ │EVENT │
           │ SVC  │ │ SVC  │ │ SVC  │ │ SVC  │ │ SVC  │
           │:8081 │ │:8082 │ │:8083 │ │:8084 │ │:8085 │
           │MySQL │ │MySQL │ │MySQL │ │MySQL │ │MySQL │
           └──┬───┘ └──────┘ └──┬───┘ └──┬───┘ └──────┘
              │                  │        │
              │   ┌──────────────┘        │
              │   │    ┌──────────────────┘
              ▼   ▼    ▼
         ┌─────────────────────────────────────────┐
         │        MESSAGE BROKER (Apache Kafka)    │
         │  Topics: order.created, payment.done,   │
         │          book.stock.updated, email...   │
         └──────┬──────────────┬───────────────────┘
                │              │
                ▼              ▼
           ┌────────┐    ┌──────────┐
           │NOTIF.  │    │ SEARCH   │
           │SERVICE │    │ SERVICE  │
           │:8086   │    │:8088     │
           │MongoDB │    │Elastic-  │
           └──┬─────┘    │search    │
              │          └──────────┘
              ▼
        ┌──────────┐
        │  FILE    │
        │ SERVICE  │
        │ :8087    │
        │MinIO/    │
        │Supabase  │
        └──────────┘
```

---

## 2. Luồng dữ liệu chính

### 2.1 Luồng đăng nhập (Authentication)

```
Client
  │ POST /auth/login {email, password}
  ▼
API Gateway (không filter route này)
  │
  ▼
Identity Service
  │ Validate credentials
  │ Generate access_token + refresh_token (JWT)
  ◄─────────────────────────────────────────────
Client lưu token và gửi kèm mọi request sau đó
```

### 2.2 Luồng request đã xác thực (Protected Request)

```
Client
  │ GET /api/books  [Bearer: access_token]
  ▼
API Gateway
  │ → Gọi Identity Service để validate token (hoặc validate JWT local)
  │ ← {userId, roles, ...}
  │ → Route request đến Book Service (kèm header X-User-Id, X-User-Roles)
  ▼
Book Service
  │ Xử lý không cần auth (đã trust header từ Gateway)
  │
  ◄ Response
```

### 2.3 Luồng đặt hàng (Order Flow)

```
Client → POST /api/orders
  ▼
API Gateway → validate token
  ▼
Order Service
  │ 1. Check book availability → gọi Book Service (REST/gRPC)
  │ 2. Tạo order trong DB
  │ 3. Gọi Payment Service (VNPay)
  │ 4. Publish Kafka event: "order.created"
  │
  ├── Kafka Consumer: Notification Service
  │     → Gửi email xác nhận đơn hàng
  │     → Push WebSocket notification
  │
  └── Kafka Consumer: Search Service
        → Cập nhật index (số lượng tồn kho)
```

---

## 3. Thiết kế Database — Database per Service

> **Nguyên tắc cốt lõi**: Mỗi service có database **riêng**. Không service nào được phép truy cập trực tiếp DB của service khác.

```
┌─────────────────────────────────────────────────────────────┐
│                    DATABASE ISOLATION                       │
│                                                             │
│  identity_db    user_db      book_db     order_db           │
│  ┌──────────┐  ┌──────────┐ ┌─────────┐ ┌────────────┐     │
│  │ users    │  │ addresses│ │ books   │ │ bills      │     │
│  │ roles    │  │ wishlist │ │ authors │ │ bill_books │     │
│  │ perms    │  │          │ │ cats    │ │ carts      │     │
│  │ tokens   │  │          │ │ series  │ │ cart_items │     │
│  └──────────┘  └──────────┘ │ pubs    │ │ payments   │     │
│                             │ suppls  │ │ shipping   │     │
│  event_db      notif_db     │ comments│ └────────────┘     │
│  ┌──────────┐  ┌──────────┐ │ invoices│                    │
│  │ events   │  │ notifs   │ └─────────┘  search_index      │
│  │ evt_rules│  │ chat_msg │             ┌────────────┐     │
│  │ evt_logs │  └──────────┘             │Elasticsearch│    │
│  └──────────┘   (MongoDB)              └────────────┘     │
│   (MySQL)                                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Service Communication Strategy

| Loại giao tiếp | Pattern | Use Case |
|---|---|---|
| **Synchronous** | REST (HTTP/JSON) | Cần response ngay (check tồn kho, validate) |
| **Synchronous** | gRPC (tương lai) | Internal service-to-service high performance |
| **Asynchronous** | Kafka (Message Queue) | Event-driven: order, notification, search index |

### Quy tắc giao tiếp
- Gateway → Services: **REST**
- Services → Services (cần kết quả ngay): **REST qua Service Discovery**
- Services → Services (không cần kết quả ngay): **Kafka events**

---

## 5. Service Discovery & Load Balancing

Hệ thống loại bỏ hoàn toàn các thành phần đăng ký dịch vụ trung gian như Eureka Server. Thay vào đó, chúng ta tận dụng giải pháp **Service Discovery tự nhiên (Native Service Discovery)** dựa trên hệ thống phân giải tên miền DNS:
- **Trong môi trường Development (Docker Compose):** Sử dụng cơ chế DNS nội bộ của Docker. API Gateway và các service gọi chéo nhau bằng chính tên của Container/Service được khai báo trong file `docker-compose.yml` (Ví dụ: `http://book-service:8083`).
- **Trong môi trường Production (Kubernetes):** Sử dụng CoreDNS của K8s và tài nguyên `Service`. Khi một Pod cần gọi service khác, nó chỉ cần gọi tên DNS của K8s Service (Ví dụ: `http://book-service:8083`). Kube-proxy sẽ tự động thực hiện Load Balancing ở phía sau.

```
┌─────────────────────────────────────┐
│          DNS SERVICE DISCOVERY      │  ← Docker Compose DNS / K8s CoreDNS
│        (Tên miền Service ổn định)   │
└────────────┬────────────────────────┘
             │ Phân giải DNS & Load Balancing
    ┌────────┴────────┐
    │                 │
┌───▼───┐         ┌───▼───┐
│Book   │         │Book   │   ← Các instances
│Pod-1  │         │Pod-2  │   của Book Service
└───────┘         └───────┘
```

---

## 6. Hạ tầng hỗ trợ

| Component | Tech | Mục đích |
|---|---|---|
| **API Gateway** | Spring Cloud Gateway | Routing, Auth filter, Rate limit |
| **Service Discovery** | Docker/K8s DNS | Phân giải tên miền nội bộ tự động |
| **Message Broker** | Apache Kafka | Async event-driven |
| **Distributed Cache** | Redis | Cache token, sessions, hot data |
| **Config Server** | Spring Cloud Config | Tập trung config cho tất cả services |
| **Tracing** | Zipkin + Sleuth | Distributed tracing |
| **Metrics** | Prometheus + Grafana | Monitoring & alerting |
| **Log Aggregation** | ELK Stack | Tập trung log |
| **Container** | Docker + Docker Compose | Dev environment |
| **Orchestration** | Kubernetes (production) | Auto scaling, HA |

---

## 7. So sánh với mô hình Bookteria

| Service trong Bookteria | Service trong BookLand | Ghi chú |
|---|---|---|
| Identity Service (MySQL) | **Identity Service** (MySQL) | Tương đồng |
| Profile Service (Neo4J) | **User Service** (MySQL) | BookLand dùng MySQL (quan hệ đơn giản hơn) |
| Post Service (MongoDB) | **Book Service** (MySQL) | BookLand → catalog, không phải social post |
| Book Service (MongoDB) | **Book Service** (MySQL) | Gộp chung |
| File Service (MongoDB) | **File Service** (MinIO/Supabase) | Tương đồng |
| Search Service (Elastic) | **Search Service** (Elasticsearch) | Tương đồng |
| Notification Service (MongoDB) | **Notification Service** (MongoDB) | Tương đồng |
| — | **Order Service** (MySQL) | BookLand có thêm E-Commerce |
| — | **Event Service** (MySQL) | BookLand có thêm Promotion |

---

*← [01 - Kiến trúc hiện tại](./01-current-architecture.md) | [03 - Phân rã service →](./03-service-decomposition.md)*
