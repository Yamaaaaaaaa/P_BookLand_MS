# 📚 BookLand Microservice Architecture — Tài liệu tổng quan

> Tài liệu này mô tả kế hoạch chuyển đổi hệ thống **BookLand** từ kiến trúc **Monolithic** hiện tại sang kiến trúc **Microservice**, lấy cảm hứng từ mô hình **Bookteria** đã được nghiên cứu.

---

## 📂 Cấu trúc tài liệu

```
document-microservice/
├── README.md                        ← Tổng quan & mục lục (file này)
├── 01-current-architecture.md       ← Phân tích kiến trúc Monolithic hiện tại
├── 02-target-architecture.md        ← Kiến trúc Microservice mục tiêu
├── 03-service-decomposition.md      ← Phân rã service chi tiết
├── 04-api-gateway.md                ← Thiết kế API Gateway
├── 05-identity-service.md           ← Identity & Auth Service
├── 06-book-service.md               ← Book Service
├── 07-order-service.md              ← Order (Bill) & Payment Service
├── 08-notification-service.md       ← Notification Service
├── 09-event-service.md              ← Event/Promotion Service
├── 10-file-service.md               ← File/Storage Service
├── 11-search-service.md             ← Search Service
├── 12-communication.md              ← Giao tiếp giữa các service
├── 13-infrastructure.md             ← Hạ tầng: Docker, Kafka, CI/CD
├── 14-migration-roadmap.md          ← Lộ trình di chuyển từng bước
├── 15-master-implementation-guide.md ← Kim chỉ nam triển khai chi tiết
├── 16-kubernetes-theory.md          ← Lý thuyết Kubernetes cho Microservices
└── 17-kubernetes-deployment-guide.md ← Hướng dẫn triển khai thực tế trên K8s
```

---

## 🎯 Mục tiêu chuyển đổi

| Tiêu chí | Monolithic (hiện tại) | Microservice (mục tiêu) |
|---|---|---|
| **Deployment** | 1 JAR duy nhất | N services độc lập |
| **Database** | 1 MySQL chung | DB riêng cho từng service |
| **Scale** | Scale cả hệ thống | Scale từng service |
| **Team** | 1 team chung | Multi-team, độc lập |
| **Fault Isolation** | 1 lỗi → sập toàn bộ | Lỗi cô lập từng service |
| **Tech Stack** | Đồng nhất Java | Polyglot (Java, Node, ...) |

---

## 🗺️ Sơ đồ kiến trúc tổng quan

```
┌─────────────────────────────────────────────────┐
│                   CLIENT LAYER                  │
│   React Web App (Vite + TS)   Mobile (Expo)     │
└──────────────────────┬──────────────────────────┘
                       │ HTTPS
┌──────────────────────▼──────────────────────────┐
│           API GATEWAY (Spring Cloud Gateway)     │
│  - Route → Service  - Auth Filter  - Rate Limit  │
└─────┬──────┬──────┬──────┬──────┬───────────────┘
      │      │      │      │      │
  ┌───┘  ┌───┘  ┌───┘  ┌───┘  ┌───┘
  ▼      ▼      ▼      ▼      ▼
[Auth] [Book] [Order] [Event] [User]
  │      │      │      │
  └──────┴──────┴──────┴──→ [Notification]
                              [File]
                              [Search]
```

---

## 📋 Danh sách service đề xuất

| # | Service | Port | Database | Mô tả |
|---|---------|------|----------|-------|
| 1 | **API Gateway** | 8080 | — | Cổng vào duy nhất |
| 2 | **Identity Service** | 8081 | MySQL | Xác thực, phân quyền |
| 3 | **User Service** | 8082 | MySQL | Quản lý profile người dùng |
| 4 | **Book Service** | 8083 | MySQL | Sách, tác giả, danh mục |
| 5 | **Order Service** | 8084 | MySQL | Đơn hàng, giỏ hàng, thanh toán |
| 6 | **Event Service** | 8085 | MySQL | Sự kiện, khuyến mãi |
| 7 | **Notification Service** | 8086 | MongoDB | Thông báo, email, WebSocket |
| 8 | **File Service** | 8087 | — | Upload, lưu trữ file/ảnh |
| 9 | **Search Service** | 8088 | Elasticsearch | Tìm kiếm nâng cao |

---

## 🚀 Quick Start — Đọc tài liệu theo thứ tự

1. **[01 - Kiến trúc hiện tại](./01-current-architecture.md)** — Hiểu rõ Monolith đang có gì
2. **[02 - Kiến trúc mục tiêu](./02-target-architecture.md)** — Tầm nhìn kiến trúc Microservice
3. **[03 - Phân rã service](./03-service-decomposition.md)** — Chi tiết từng service
4. **[04..11 - Thiết kế từng service](./04-api-gateway.md)** — Deep dive từng service
5. **[12 - Giao tiếp](./12-communication.md)** — REST vs Message Queue
6. **[13 - Hạ tầng](./13-infrastructure.md)** — Docker, Kafka, Kubernetes
7. **[14 - Lộ trình](./14-migration-roadmap.md)** — Kế hoạch di chuyển từng bước
8. **[15 - Kim chỉ nam triển khai](./15-master-implementation-guide.md)** — Các bước triển khai code thực tế
9. **[16 - Lý thuyết Kubernetes](./16-kubernetes-theory.md)** — Kiến thức K8s cơ bản cho dự án
10. **[17 - Hướng dẫn triển khai K8s](./17-kubernetes-deployment-guide.md)** — Quy trình deploy chi tiết từng bước

---

*Phiên bản: 1.0 | Ngày tạo: 2026-05-14 | Dự án: PTIT BookLand*
