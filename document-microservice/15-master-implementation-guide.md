# 15 — Master Implementation Guide (Kim chỉ nam triển khai)

> Tài liệu này là **bản hướng dẫn thực thi (Actionable Plan)** chi tiết nhất để lập trình viên từng bước xây dựng hệ thống Microservice `P_BookLand_MS` từ con số 0. Nó định nghĩa các tiêu chuẩn, phiên bản, quy trình code và checklist cho từng Phase.

---

## 🛠️ 1. Quy chuẩn dự án (Project Standards)

### 1.1 Phiên bản công nghệ cốt lõi
Để đảm bảo tính ổn định cao nhất, chúng ta sẽ **KHÔNG** dùng Spring Boot 3.5.x (quá mới, có thể gây lỗi tương thích) mà sẽ dùng phiên bản LTS hoặc stable tương thích hoàn hảo với Spring Cloud:
- **Java**: 17 (Cố định, chung với monolith)
- **Spring Boot**: `3.3.5` (Stable & tương thích tốt)
- **Spring Cloud**: `2023.0.3`
- **Build Tool**: Gradle (Groovy) — dùng kiến trúc **Độc lập (Polyrepo-style)**
- **Cơ sở dữ liệu**: MySQL 8.x, MongoDB 7.x, Redis 7.x
- **Message Broker**: Confluent Kafka 7.5.0

### 1.2 Kiến trúc Môi trường độc lập (Independent Services)
Hệ thống sẽ được đặt trong thư mục: `d:\Microservices\P_BookLand_MS`.
Tuy nhiên, thay vì gộp chung vào 1 file build gốc, **mỗi Service sẽ là một Project Spring Boot hoàn toàn độc lập**, có file `build.gradle` và môi trường riêng biệt. Cấu trúc như sau:
```text
P_BookLand_MS/
├── docker-compose.yml        ← File chạy hạ tầng (MySQL, Kafka, Redis...)
├── .env                      ← Biến môi trường local
├── document-microservice/    ← Thư mục chứa tài liệu thiết kế (Docs hiện tại)
├── BookLand_FE/              ← Thư mục chứa Web App (React + Vite + TS)
├── BookLand_Mobile/          ← Thư mục chứa Mobile App (React Native + Expo)
└── services/                 ← Chứa các Microservices độc lập
    ├── api-gateway/          ← Project Spring Boot riêng
    ├── identity-service/     ← Project Spring Boot riêng
    ├── user-service/         ← Project Spring Boot riêng
    ├── book-service/         ← Project Spring Boot riêng
    ├── order-service/        ← Project Spring Boot riêng
    ├── event-service/        ← Project Spring Boot riêng
    ├── notification-service/ ← Project Spring Boot riêng
    ├── file-service/         ← Project Spring Boot riêng
    └── search-service/       ← Project Spring Boot riêng
```

### 1.3 Nguyên tắc Code (Coding Conventions)
- **Độc lập hoàn toàn Data/Event model**: Mọi object dùng để giao tiếp (như `OrderCreatedEvent`, `UserDto`) sẽ được **nhân bản (duplicate) ở mỗi service** cần dùng. Chúng ta đánh đổi việc lặp code để lấy sự độc lập tuyệt đối, không có thư viện dùng chung nào.
- **Bảo mật Internal API**: Mọi API gọi chéo giữa các service (Server to Server) phải có tiền tố `/api/internal/**` và được bảo vệ bằng header `X-Internal-Token`.
- **Xử lý lỗi độc lập**: Mỗi service tự định nghĩa class `ApiResponse` và `GlobalExceptionHandler` riêng biệt, nhưng phải tự giác tuân thủ chung một format JSON trả về (ví dụ: `code`, `message`, `details`).
- **Kafka Topics**: Tên topic dùng dấu chấm `.` (Ví dụ: `order.created`, `book.stock.updated`).
- **Entity ID References**: Trong Monolith dùng `@ManyToOne` hoặc `@OneToMany`. Nhưng ở Microservice, nếu entity nằm ở 2 service khác nhau, **không được mapping chéo**. Chỉ lưu `Long foreignKeyId` dạng raw data.

---

## 🚀 2. Kế hoạch triển khai chi tiết từng bước (Step-by-Step)

### 🔴 PHASE 0: Nền móng hệ thống (Infrastructure & Core)
*Bắt buộc phải xong và chạy ổn định 100% trước khi code service nghiệp vụ.*

**Bước 0.1: Khởi tạo Infrastructure**
1. Mở `d:\Microservices\P_BookLand_MS`.
2. Copy nội dung `docker-compose.yml` từ file `13-infrastructure.md` ra thư mục gốc.
3. Chạy `docker-compose up -d` để khởi động MySQL, Redis, Kafka, Zookeeper, MongoDB lên. Đảm bảo mọi thứ báo "Xanh" (Running).

**Bước 0.2: Dựng Cổng giao tiếp (API Gateway)**
1. Tạo module `services/api-gateway`.
2. Thêm dependency `spring-cloud-starter-gateway`.
3. Định nghĩa Route cơ bản tới các service qua cấu hình DNS tĩnh trong `application.yml` (ví dụ route `/auth/**` sang `http://identity-service:8081`).
4. Setup `CorsWebFilter` chung tại đây để frontend gọi không bị lỗi CORS.
*(Note: Filter xác thực JWT sẽ được lập trình sau khi code xong Identity Service)*.

---

### 🟠 PHASE 1: Identity Service (Quản lý Xác thực)
*Nền tảng bảo mật cho toàn bộ hệ thống.*

1. **Khởi tạo module**: `services/identity-service` (Port: `8081`).
2. **Database**: Kết nối với database `identity_db` trong MySQL.
3. **Migrate Entities**: Mang các Entity: `User` (lưu ý: chỉ giữ lại các trường dùng để auth như email, password, enabled), `Role`, `Permission`, `InvalidatedToken` từ project Monolith cũ sang.
4. **Logic cốt lõi**:
   - Chức năng Đăng ký, Đăng nhập (tạo JWT access_token & refresh_token).
   - Chức năng Logout (lưu token vào Redis để blacklist).
   - Thiết kế Endpoint nội bộ: `POST /auth/introspect` (để API Gateway gọi vào check token).
5. **Cập nhật API Gateway**: Trở lại project `api-gateway`, viết `AuthenticationFilter`. Flow: Gateway nhận request → lấy JWT từ header → gọi REST sang Identity Service check token → Nếu hợp lệ mới forward request xuống service phía sau.

---

### 🟡 PHASE 2: Book Service (Quản lý Sản phẩm cốt lõi)
*Domain trung tâm, chứa nhiều bảng nhất.*

1. **Khởi tạo module**: `services/book-service` (Port: `8083`).
2. **Database**: Kết nối `book_db`.
3. **Migrate Entities**: Bê nguyên mảng `Book`, `Category`, `Author`, `Publisher`, `Supplier`, `BookComment` từ Monolith sang.
4. **Code REST APIs**:
   - Các API GET public: Lấy danh sách sách (phân trang, filter), chi tiết sách.
   - Các API CRUD cho Admin: Tạo/Sửa/Xóa sách.
5. **Internal API (Chuẩn bị cho Order)**:
   - Viết API `GET /api/internal/books/{id}/stock` (Lấy số lượng tồn kho) 
   - Viết API `PUT /api/internal/books/{id}/stock` (Trừ/Cộng tồn kho)
6. **Kafka Producer**:
   - Cài đặt Kafka Template, bắn sự kiện `book.created`, `book.updated` mỗi khi Admin tạo/sửa sách.

---

### 🟢 PHASE 3: Notification Service (Thông báo & Socket)
*Dễ làm, độc lập, bước đệm hoàn hảo để làm quen với hệ thống Kafka.*

1. **Khởi tạo module**: `services/notification-service` (Port: `8086`).
2. **Database**: Kết nối MongoDB `notification_db`.
3. **Kafka Consumers**:
   - Viết các `@KafkaListener` để lắng nghe các topic (ví dụ: nghe event tạo sách, tạo đơn hàng).
4. **Tích hợp Email**: Chuyển file cấu hình và logic gửi Email bằng `JavaMailSender` từ Monolith sang.
5. **Tích hợp WebSocket**: Chuyển cấu hình STOMP / SockJS từ Monolith sang. Khi Consumer nhận được Kafka Event (vd: `order.status.updated`) → Bắn message qua WebSocket xuống trực tiếp thiết bị của người dùng (dựa trên `userId`).

---

### 🔵 PHASE 4: Order Service (Thương mại & Thanh toán)
*Phức tạp nhất do yêu cầu gọi chéo nhiều service.*

1. **Khởi tạo module**: `services/order-service` (Port: `8084`).
2. **Database**: Kết nối `order_db`.
3. **Migrate Entities**: Các bảng liên quan đến `Cart`, `CartItem`, `Bill`, `BillBook`, `PaymentTransaction`...
4. **Cấu hình Feign Client**:
   - Thêm `spring-cloud-starter-openfeign`.
   - Viết interface gọi API của `book-service` để check giá và tồn kho.
5. **Flow Đặt hàng (Saga Choreography cơ bản)**:
   - User gọi API tạo Bill → Order Service gọi Feign Client sang Book Service hỏi tồn kho.
   - Nếu tồn kho OK → Order Service lưu Bill vào DB (trạng thái PENDING) → Bắn Kafka Event `order.created`.
   - Notification Service nghe thấy event `order.created` → Tự động gửi Email hóa đơn cho User.
6. **Tích hợp VNPay**: Đưa code VNPay cũ vào, gắn callback URL chuẩn thông qua Gateway.

---

### 🟣 PHASE 5: File Service (Quản lý File & Hình ảnh)
1. **Khởi tạo module**: `services/file-service` (Port: `8087`).
2. **Cấu hình Storage**: Có thể dùng cấu hình Supabase Storage hiện tại hoặc chạy MinIO local qua Docker.
3. **APIs**: Xây dựng API `/api/files/upload` hỗ trợ upload hình ảnh sách, avatar và trả về đường dẫn public (URL tĩnh) để các service khác lưu trữ vào database.

---

### 🟤 PHASE 6: Event Service (Sự kiện & Khuyến mãi)
1. **Khởi tạo module**: `services/event-service` (Port: `8085`).
2. **Database**: Kết nối `event_db`. Bóc tách bảng `Event`, `EventRule`, `EventAction` từ Monolith.
3. **Internal API**: Xây dựng API nội bộ để tính toán mã giảm giá. Khi user tạo Order (ở Phase 4), Order Service sẽ gọi qua Feign Client sang đây để lấy số tiền được giảm.
4. **APIs**: Cung cấp API cho admin quản lý các chương trình ưu đãi, banner.

---

### ⚫ PHASE 7: Search Service (Tìm kiếm siêu tốc)
1. **Khởi tạo module**: `services/search-service` (Port: `8088`).
2. **Database**: Kết nối với `Elasticsearch`.
3. **Kafka Consumers**: Lắng nghe các event từ Book Service (ví dụ `book.created`, `book.updated`, `book.stock.updated`) để tự động cập nhật index lên Elasticsearch.
4. **APIs**: Viết API Full-text Search mạnh mẽ, hỗ trợ filter, autocomplete để thay thế cho truy vấn SQL `LIKE` chậm chạp.

---

### ⚪ PHASE 8: User Service (Quản lý Thông tin người dùng)
1. **Khởi tạo module**: `services/user-service` (Port: `8082`).
2. **Database**: Kết nối `user_db`.
3. **Migrate Entities**: Mang `Address`, `Wishlist`, và thông tin cá nhân (name, avatar, phone) của `User` sang.
4. **Cấu hình Feign Client**: Gọi qua Book Service để lấy thông tin chi tiết sách trong Wishlist.
5. Khai báo route `/api/users/**` tại Gateway.

---

### 📱 PHASE 9: Cập nhật Web Frontend & Mobile App
*Chỉ thực hiện sau khi toàn bộ Backend API đã chạy thông suốt qua cổng API Gateway.*

**Bước 9.1: BookLand Web App (React + Vite + TS)**
1. Mở dự án `BookLand_FE`.
2. Thay đổi `BASE_URL` trong `.env` để trỏ toàn bộ request về cổng của API Gateway (ví dụ `http://localhost:8080`).
3. Khớp lại logic WebSocket để nhận Notification STOMP từ `notification-service`.

**Bước 9.2: BookLand Mobile App (React Native + Expo)**
1. Mở dự án `BookLand_Mobile`.
2. Đảm bảo cấu hình môi trường gọi về IP LAN của API Gateway (Ví dụ: thay vì `localhost`, phải dùng IP mạng Wifi như `http://192.168.1.xxx:8080` để app trên điện thoại có thể kết nối được).
3. Tái sử dụng các endpoints chuẩn (do API Gateway đã proxy mọi thứ nên việc tích hợp cho Mobile y hệt như làm cho Web).

---

## 🎯 3. Quy trình code tính năng hàng ngày (Daily Developer Workflow)

Để việc phát triển không bị rủi ro, mỗi khi chuyển dời một nghiệp vụ, hãy tuân theo quy trình 5 bước sau:

1. **Khởi tạo Database (DB First)**: Setup schema (tables) cho service mới trong MySQL. Tốt nhất nên cấu hình Flyway hoặc Liquibase, nếu không thì phải tạo script SQL.
2. **Copy Models/Entities**: Bóc tách các Entity class từ Monolith sang service tương ứng. **Cắt đứt các liên kết ngoại (Foreign Keys) trỏ chéo module**. (Ví dụ: `Bill` không thể `@ManyToOne` đến `User`, mà chỉ lưu field `Long userId`).
3. **Chuyển giao Repository & Service**: Mang logic từ Monolith sang. Nhận diện các đoạn code đang gọi chéo (VD: `orderService` gọi `bookService`) → Lập tức thay thế bằng cách gọi qua **Feign Client**.
4. **Bóc tách Controller**: Copy controller cũ, điều chỉnh lại đường dẫn API nếu cần.
5. **Khai báo Route ở Gateway**: Mở cấu hình `api-gateway`, khai báo path của service mới để Frontend có thể giao tiếp qua một cổng thống nhất là `:8080`.

---
**📍 TIP**: Tài liệu này đóng vai trò sống còn trong quá trình triển khai thực tế. Hãy sử dụng nó làm Check-list cho team. Xong phase nào đánh dấu "Tick" phase đó.

---

*← [14 - Lộ trình di chuyển](./14-migration-roadmap.md) | [16 - Lý thuyết Kubernetes →](./16-kubernetes-theory.md)*
