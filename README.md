# Hướng Dẫn Chạy Local (P_BookLand_MS)

Hướng dẫn nhanh để khởi chạy dự án BookLand ở môi trường Local.

---

## 1. Chuẩn Bị Mã Nguồn

Dự án được lưu trữ trên Git (nhánh `dev`). Để lấy mã nguồn mới nhất:

```bash
git pull origin dev
```
## 2. Chạy Toàn Bộ Hệ Thống (Backend & Frontend)

Cơ chế chạy tối ưu: Biên dịch file `.jar` cho Backend trên máy thật (Host) và dùng Docker Compose để đóng gói, khởi chạy siêu nhanh. Frontend cũng được tích hợp sẵn vào Docker Compose.

### Bước 1: Build file JAR trên máy thật
Mở Terminal tại thư mục gốc `P_BookLand_MS` và chạy:
```bash
mvn clean package -DskipTests
```
*(Yêu cầu: Đã cài JDK 17 và Maven trên máy thật. Bước này sẽ biên dịch mã nguồn thành các file JAR để copy vào container)*

### Bước 2: Khởi chạy bằng Docker Compose
Sau khi build xong file JAR, chạy lệnh:
```bash
docker compose up -d --build
```
*(Lệnh này sẽ khởi chạy tất cả Backend Microservices, Databases, Kafka, và cả Frontend)*

### Bước 3: Truy cập ứng dụng
- **Frontend (Web App):** http://localhost:5173
- **API Gateway:** http://localhost:8080

---

## 3. Cập Nhật Khi Có Thay Đổi Code

### Khi sửa code Backend ở một Service cụ thể (Ví dụ: `order-service`)
Chỉ cần build lại JAR và restart riêng container đó trong vài giây:
1. Build lại JAR:
   ```bash
   mvn clean package -DskipTests
   ```
2. Build và restart container cụ thể:
   ```bash
   docker compose up -d --build order-service
   ```

### Khi sửa code Frontend (`BookLand_FE`)
Frontend đã được cấu hình build thành file tĩnh (static build) qua Nginx. Nếu có sửa đổi trên FE:
```bash
docker compose up -d --build frontend
```

---
## 4. Tạo dữ liệu khởi đầu (Book - Elastic Search)
- Truy cập http://localhost:8080/webjars/swagger-ui/index.html
- Đăng nhập
- Lấy Token mang sang Book Service 
- Chọn API init 
- Lấy Token mang sang Search Service 
- Chọn API init 

=> Tạo bộ dữ liệu mẫu thành công
