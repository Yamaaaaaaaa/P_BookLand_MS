# Hướng Dẫn Sử Dụng Docker Compose Cho Dự Án P_BookLand_MS

Tài liệu này cung cấp các lệnh Docker Compose cơ bản và nâng cao để quản lý và vận hành hệ thống Microservices của bạn.

> [!NOTE]
> Bạn có thể sử dụng `docker compose` (Docker v2 - Khuyến nghị) hoặc `docker-compose` (Docker v1) thay thế cho nhau tùy thuộc vào phiên bản Docker được cài đặt trên máy của bạn.

---

## 1. Khởi Chạy Hệ Thống (`up`)

Dùng để tạo và khởi chạy các container được định nghĩa trong [docker-compose.yml](file:///d:/Microservices/P_BookLand_MS/docker-compose.yml).

| Lệnh | Ý nghĩa |
| :--- | :--- |
| **`docker compose up`** | Khởi chạy tất cả các dịch vụ ở chế độ foreground (hiển thị log trực tiếp trên terminal). Nhấn `Ctrl + C` để dừng. |
| **`docker compose up -d`** | Khởi chạy tất cả các dịch vụ dưới nền (detached mode). Giải phóng terminal. |
| **`docker compose up --build`** | Build lại các Dockerfile trước khi khởi chạy các container. |
| **`docker compose up -d --build`** | Vừa build lại vừa chạy dưới nền (Đây là lệnh thường dùng nhất khi có thay đổi code). |
| **`docker compose up --force-recreate`** | Bắt buộc tạo lại các container ngay cả khi cấu hình hoặc image không thay đổi. |

---

## 2. Dừng Và Dọn Dẹp Hệ Thống (`down`)

Dùng để dừng và xóa các container, mạng (networks), volumes và images được tạo bởi lệnh `up`.

| Lệnh | Ý nghĩa |
| :--- | :--- |
| **`docker compose down`** | Dừng và xóa toàn bộ các container và networks của dự án. Không xóa dữ liệu trong volumes. |
| **`docker compose down -v`** | Dừng, xóa container, networks **VÀ XÓA LUÔN cả các Volume dữ liệu** (db data, kafka data, etc.). *Lưu ý: Mất sạch dữ liệu database.* |
| **`docker compose down --rmi all`** | Dừng và xóa sạch các images được xây dựng bởi dự án. |

---

## 3. Biên Dịch Lại Images (`build`)

Chỉ build/rebuild lại các images từ Dockerfile mà không chạy các container.

| Lệnh | Ý nghĩa |
| :--- | :--- |
| **`docker compose build`** | Biên dịch lại image cho tất cả các dịch vụ có khai báo block `build` trong file compose. |
| **`docker compose build --no-cache`** | Build lại từ đầu mà không sử dụng cache cũ của Docker (dùng khi cài thêm thư viện mới hoặc muốn đảm bảo build sạch). |

---

## 4. Thao Tác Với Từng Dịch Vụ Riêng Biệt (Build / Run Riêng)

Khi bạn chỉ chỉnh sửa mã nguồn của một service (ví dụ: `user-service`), bạn **không cần** chạy lại toàn bộ hệ thống. Chỉ cần rebuild và restart đúng service đó.

Các service name tương ứng trong [docker-compose.yml](file:///d:/Microservices/P_BookLand_MS/docker-compose.yml) của bạn bao gồm:
- **Business Services**: `api-gateway`, `identity-service`, `user-service`, `book-service`, `order-service`, `event-service`, `notification-service`, `file-service`, `search-service`.
- **Infrastructure Services**: `identity-db`, `user-db`, `book-db`, `redis`, `kafka`, `elasticsearch`, `minio`, v.v.

### 4.1. Khởi chạy riêng một hoặc một vài dịch vụ
```bash
# Khởi chạy chỉ database và cache trước
docker compose up -d identity-db user-db redis

# Khởi chạy riêng user-service và các dịch vụ phụ thuộc của nó (depends_on)
docker compose up -d user-service
```

### 4.2. Build riêng một dịch vụ
```bash
# Build lại image cho duy nhất user-service
docker compose build user-service

# Build lại không dùng cache cho identity-service
docker compose build --no-cache identity-service
```

### 4.3. Rebuild và Restart riêng một dịch vụ đang chạy (Khuyên dùng khi Dev)
Khi sửa code Java của một service, hãy dùng lệnh sau để Docker build lại code mới và khởi chạy lại riêng container đó:
```bash
# Rebuild và Restart riêng identity-service dưới nền
docker compose up -d --build identity-service

# Rebuild và Restart riêng api-gateway
docker compose up -d --build api-gateway

# Rebuild và Restart đồng thời nhiều service
docker compose up -d --build identity-service user-service api-gateway
```

### 4.4. Dừng / Khởi động / Khởi động lại riêng một container (Không build lại)
```bash
# Dừng tạm thời user-service
docker compose stop user-service

# Khởi động lại user-service
docker compose start user-service

# Restart nhanh user-service (tắt rồi bật lại)
docker compose restart user-service
```

---

## 5. Giám Sát Và Debug (Logs & Troubleshooting)

| Lệnh | Ý nghĩa |
| :--- | :--- |
| **`docker compose ps`** | Xem danh sách các container đang chạy và trạng thái của chúng (Up, Exit, Ports...). |
| **`docker compose logs`** | Xem toàn bộ log của tất cả các container kể từ lúc khởi chạy. |
| **`docker compose logs -f`** | Xem log trực tiếp (real-time stream) của toàn bộ hệ thống. |
| **`docker compose logs -f <service-name>`** | Xem log trực tiếp của **một** service cụ thể. (Ví dụ: `docker compose logs -f identity-service`). |
| **`docker compose exec <service-name> sh`** | Truy cập vào terminal bên trong container đang chạy (dùng shell `sh` hoặc `bash` nếu có). |

---

## 🚀 Ví dụ Quy Trình Phát Triển Thực Tế:

1. **Bắt đầu ngày làm việc (Chạy toàn bộ infra & services):**
   ```bash
   docker compose up -d
   ```
2. **Bạn thay đổi logic trong `identity-service` và muốn chạy bản mới nhất:**
   ```bash
   docker compose up -d --build identity-service
   ```
3. **Theo dõi xem `identity-service` có bị lỗi gì khi khởi động không:**
   ```bash
   docker compose logs -f identity-service
   ```
4. **Kết thúc ngày làm việc (Tắt sạch để nhẹ máy):**
   ```bash
   docker compose down
   ```
