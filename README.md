# 🚀 Hướng Dẫn Chạy Local (P_BookLand_MS)

Hướng dẫn nhanh để khởi chạy dự án BookLand ở môi trường Local.

---

## 🖥️ 1. Chạy Backend (Microservices)

Cơ chế chạy tối ưu: Biên dịch file `.jar` trên máy thật (Host) và dùng Docker Compose để đóng gói, khởi chạy siêu nhanh.

### Bước 1: Build file JAR trên máy thật
Mở Terminal tại thư mục gốc `P_BookLand_MS` và chạy:
```bash
mvn clean package -DskipTests
```
*(Yêu cầu: Đã cài JDK 17 và Maven trên máy thật)*

### Bước 2: Khởi chạy toàn bộ hệ thống bằng Docker Compose
Sau khi build xong file JAR, chạy lệnh:
```bash
docker compose up -d --build
```

### Bước 3: Khi bạn sửa code ở một Service cụ thể (Ví dụ: `order-service`)
Chỉ cần build lại JAR và restart riêng container đó trong vài giây:
1. Build lại JAR:
   ```bash
   mvn clean package -DskipTests
   ```
2. Build và restart container cụ thể:
   ```bash
   docker compose up -d --build order-service
   ```

---
### Bước 4: Tạo dữ liệu khởi đầu (Book - Elastic Search):
- Truy cập http://localhost:8080/webjars/swagger-ui/index.html
- Đăng nhập
- Lấy Token mang sang Book Service 
- Chọn API init 
- Lấy Token mang sang Search Service 
- Chọn API init 

=> Tạo bộ dữ liệu mẫu thành công


## 🎨 2. Chạy Frontend (FE)

Mở một Terminal mới, di chuyển vào thư mục `BookLand_FE` và chạy các lệnh sau:

```bash
cd BookLand_FE

# Cài đặt các thư viện dependencies
npm install

# Khởi chạy ứng dụng ở chế độ Development
npm run dev
```

---
```
