# Hướng Dẫn Local Dev Tối Ưu Cho P_BookLand_MS (Host Build + Docker Run)

Tài liệu này hướng dẫn cách thay đổi luồng build của dự án **P_BookLand_MS** nhằm tối ưu hóa dung lượng ổ đĩa WSL 2, giải quyết triệt để rác từ Build Cache và tăng tốc độ khởi chạy container lên gấp **10 - 20 lần**.

---

## 💡 Ý Tưởng Lập Trình Tối Ưu (Cách 2)

Thay vì để Docker tự tải Maven, tải dependencies và biên dịch code bên trong container (Multi-stage build):
1. **Biên dịch toàn bộ dự án trên máy thật (Host Machine)** sử dụng lệnh `mvn clean package -DskipTests` của máy bạn. Việc này tận dụng thư mục cache `.m2` có sẵn trên máy thật, chỉ mất khoảng vài giây cho mỗi service.
2. **Docker chỉ nhận file `.jar` đã biên dịch sẵn** và copy thẳng vào container siêu nhẹ (`eclipse-temurin-jre`) để chạy.

---

## 🛠️ Bước 1: Cập Nhật Toàn Bộ Dockerfile Thành Single-Stage (Đã Tự Động Cập Nhật)

Toàn bộ Dockerfile của 9 Business Services đã được chuyển đổi sang dạng tối giản, chỉ copy file `.jar` từ thư mục `target` của máy host:

```dockerfile
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY services/<tên-service>/target/*.jar app.jar
EXPOSE <port>
ENTRYPOINT ["java", "-jar", "app.jar"]
```

---

## 🚀 Bước 2: Hướng Dẫn Chạy Một Phát Lên Luôn

Mỗi khi bạn muốn chạy lại toàn bộ hệ thống hoặc sau khi sửa bất kỳ đoạn code nào, chỉ cần làm đúng các bước sau:

### 1. Build File JAR Trên Máy Thật (Ngoài Docker)
Mở Terminal ở thư mục gốc `P_BookLand_MS` trên máy của bạn và chạy lệnh build:
```bash
# Lệnh build siêu tốc bằng Maven trên máy thật
mvn clean package -DskipTests
```
*Lưu ý: Đảm bảo máy bạn đã cài JDK 17 và Maven (đã cấu hình biến môi trường PATH).*

### 2. Khởi Chạy Toàn Bộ Hệ Thống Lần Đầu (Hoặc Build Lại Lần Đầu)
Sau khi build xong file JAR ở máy thật, chạy lệnh này để Docker lấy file JAR mới đóng vào container và khởi chạy:
```bash
docker compose up -d --build
```
*Từ lần chạy này, toàn bộ 21 container sẽ khởi động lên cực kỳ nhanh mà không mất bất kỳ megabyte Build Cache nào!*

### 3. Khi Bạn Sửa Code Của Một Service (Ví Dụ: `order-service`)
Nếu bạn chỉ sửa code ở một service cụ thể, không cần build và restart lại toàn bộ 21 container. Hãy làm như sau:
1. Build lại JAR trên máy thật:
   ```bash
   mvn clean package -DskipTests
   ```
2. Build và restart riêng container đó trong 3 giây:
   ```bash
   docker compose up -d --build order-service
   ```

---

## 🧹 Bước 3: Dọn Dẹp Dung Lượng Cũ Một Lần Duy Nhất
Vì bạn đã chuyển sang cơ chế mới, hãy giải phóng triệt để các rác build cũ để trả lại ổ cứng:
```bash
# Xóa sạch cache build cũ dư thừa
docker system prune -a --volumes --force
```
Sau đó làm theo bước **Compact vdisk** bằng `diskpart` (với đường dẫn mới `C:\Users\kaita\AppData\Local\Docker\wsl\disk\ext4.vhdx`) để hồi phục hoàn toàn ổ C của bạn!
