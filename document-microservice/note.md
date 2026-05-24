1. Không được tự ý Build (Do tôi đã sử dụng Docker để chạy rồi)

---

# HƯỚNG DẪN CẤU HÌNH SWAGGER (API DOCS) KHI THÊM MICROSERVICE MỚI

Mỗi khi hệ thống thêm một Microservice mới và muốn tích hợp tài liệu API của service đó vào trang Swagger UI chung tại **API Gateway** (cổng `8080`), bạn cần thực hiện đầy đủ **5 bước** sau để tránh lỗi CORS hoặc Unauthenticated (1401):

### 1. Thêm Thư Viện OpenAPI Trong Service Mới
Khai báo dependency trong `pom.xml` của service mới:
```xml
<dependency>
    <groupId>org.springdoc</groupId>
    <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
    <version>2.6.0</version>
</dependency>
```

### 2. Định Nghĩa Server Cổng Gateway Trong `SwaggerConfig.java`
Để tránh lỗi **CORS** và **Failed to fetch** khi gọi API thử trên Swagger (do trình duyệt cố gắng gửi trực tiếp tới port riêng của container), bắt buộc phải cấu hình danh sách server thông qua cổng Gateway trong Bean `OpenAPI`:

```java
@Value("${app.openapi.dev-url:http://localhost:8080}")
private String devUrl;

@Value("${app.openapi.prod-url:http://3.107.238.92:8080}")
private String prodUrl;

@Bean
public OpenAPI openAPI() {
    return new OpenAPI()
            // ... các cấu hình Info, SecurityScheme khác
            .servers(List.of(
                    new Server().url(devUrl).description("Development Server (Gateway)"),
                    new Server().url(prodUrl).description("Production Server (Gateway)"),
                    new Server().url("/").description("Relative Server Route (Auto-detect)")));
}
```

### 3. Cập Nhật Cấu Hình Định Tuyến Tại `api-gateway` (`application.yml`)
Cập nhật file `services/api-gateway/src/main/resources/application.yml`:
* **Thêm route API Docs** của service mới:
  ```yaml
          # <New> Service API Docs
          - id: <new>-service-api-docs
            uri: http://${<NEW>_SERVICE_HOST:localhost}:<port>
            predicates:
              - Path=/<new>-service/v3/api-docs
            filters:
              - RewritePath=/<new>-service/v3/api-docs, /v3/api-docs
  ```
* **Đăng ký hiển thị ở Dropdown** của Swagger UI:
  ```yaml
  springdoc:
    swagger-ui:
      urls:
        - name: <New> Service
          url: /<new>-service/v3/api-docs
  ```

### 4. Bypass Bảo Mật Của Gateway Cho API Docs
Thêm đường dẫn api-docs của service mới vào mảng `publicEndpoints` trong [AuthenticationFilter.java](file:///d:/Microservices/P_BookLand_MS/services/api-gateway/src/main/java/com/bookland/gateway/config/AuthenticationFilter.java) của API Gateway để tránh lỗi **1401 Unauthenticated** khi load định nghĩa API:

```java
private String[] publicEndpoints = {
        // ... các endpoint khác
        "/<new>-service/v3/api-docs",
};
```

### 5. Rebuild Lại Các Container Để Áp Dụng
Chạy lệnh rebuild để nạp lại cấu hình mới của Gateway và khởi chạy service mới:
```bash
docker compose up -d --build api-gateway <new-service>
```