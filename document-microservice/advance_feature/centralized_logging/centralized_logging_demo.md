# KỊCH BẢN DEMO HỆ THỐNG CENTRALIZED LOGGING (EFK STACK)

Tài liệu này cung cấp một kịch bản từng bước (Step-by-step) để bạn có thể tự tin thuyết trình hoặc kiểm thử tính năng của hệ thống Quản lý Log tập trung (EFK Stack) trên dự án BookLand Microservices.

---

## MỤC TIÊU BẢN DEMO
1. Chứng minh khả năng thu thập log thời gian thực từ nhiều microservices độc lập về một nơi duy nhất.
2. Trình bày sức mạnh tìm kiếm, lọc (filter) log theo nhiều tiêu chí (theo dịch vụ, mức độ nghiêm trọng, từ khóa lỗi).
3. Hướng dẫn cách tạo biểu đồ phân tích tần suất log và tạo Dashboard quản trị chuyên nghiệp trên Kibana.

---

## CHUẨN BỊ TRƯỚC KHI DEMO
- Đảm bảo toàn bộ hệ thống đang chạy ổn định (`docker compose up -d` hoặc chạy trên Kubernetes/Minikube Cloud).
- Đã hoàn thành cấu hình **Data View** `bookland-*` trên Kibana theo hướng dẫn triển khai.
- Chuẩn bị sẵn các tab trình duyệt tùy theo môi trường triển khai của bạn:

| Thành Phần | Môi Trường Local (Docker Compose) | Môi Trường Cloud / Kubernetes (Minikube) |
| :--- | :--- | :--- |
| **Frontend App** | [http://localhost:5173](http://localhost:5173) | Tên miền Cloud của bạn (Ví dụ: `http://p-bookland.io.vn` hoặc `http://bookland.local` nếu cấu hình Hosts) |
| **API Gateway Swagger** | [http://localhost:8080/webjars/swagger-ui/index.html](http://localhost:8080/webjars/swagger-ui/index.html) | API Gateway URL của bạn (Ví dụ: `http://api.p-bookland.io.vn/webjars/swagger-ui/index.html` hoặc `http://api.bookland.local/webjars/swagger-ui/index.html`) |
| **Kibana Discover** | [http://localhost:5601/app/discover](http://localhost:5601/app/discover) | Truy cập qua Port-Forward: [http://localhost:5601/app/discover](http://localhost:5601/app/discover) (Xem lưu ý bên dưới) |

> [!TIP]
> **Lưu ý truy cập Kibana trên Cloud/Kubernetes**:
> Vì lí do bảo mật, Kibana không nên exposed công khai ra ngoài internet. Bạn có thể mở một Terminal trên máy cá nhân và tạo một đường truyền an toàn (port-forward) từ máy của bạn tới Cluster Cloud bằng lệnh:
> ```bash
> kubectl port-forward svc/bookland-kibana 5601:5601 -n bookland
> ```
> Giữ Terminal này chạy, và bạn có thể truy cập Kibana Discover cực kỳ an toàn tại [http://localhost:5601/app/discover](http://localhost:5601/app/discover).

---

## KỊCH BẢN CHI TIẾT TỪNG BƯỚC

### PHẦN 1: Giả Lập Traffic Bình Thường (Happy Path Logs)

*Mục tiêu: Cho thấy log chảy về Elasticsearch & Kibana theo thời gian thực từ các hoạt động bình thường.*

1. **Bước 1**: Truy cập **Frontend App** (Môi trường Local: `http://localhost:5173` | Môi trường Cloud: `http://p-bookland.io.vn` hoặc `http://bookland.local`) và thực hiện lướt xem danh sách sách, click vào một quyển sách bất kỳ để xem chi tiết. Các hành động này sẽ kích hoạt API Gateway, Book Service, và User Service.
2. **Bước 2**: Quay trở lại màn hình **Kibana Discover**:
   - Nhấn nút **Refresh** (hoặc chọn tự động refresh mỗi 5 giây ở góc trên bên phải).
   - Bạn sẽ thấy hàng loạt dòng log mới đổ về.
3. **Bước 3**: Trình bày cách lọc log theo dịch vụ cụ thể:
   - Tại thanh tìm kiếm trên cùng của Kibana, nhập:
     ```kql
     container_name : "book-service"
     ```
   - Ấn **Enter** hoặc click **Apply**.
   - **Kết quả hiển thị**: Chỉ còn logs được phát sinh từ dịch vụ quản lý sách (`book-service`) hiển thị trên màn hình. Chỉ ra cho người xem các thông tin quan trọng trong một dòng log:
     - `@timestamp`: Thời gian log được đẩy lên.
     - `log`: Nội dung log Spring Boot chi tiết (VD: `Initializing connection pool...`, `Select book by ID...`).
     - `container_name`: Tên container phát sinh log.

---

### PHẦN 2: Giám Sát và Truy Vết Lỗi Hệ Thống (Exception & Error Tracking)

*Mục tiêu: Chứng minh tính hiệu quả của EFK trong việc phát hiện sự cố nhanh chóng.*

1. **Bước 1 (Tạo log lỗi)**: Mở **API Gateway Swagger UI** (Môi trường Local: `http://localhost:8080/webjars/swagger-ui/index.html` | Môi trường Cloud: `http://api.p-bookland.io.vn/webjars/swagger-ui/index.html` hoặc `http://api.bookland.local/webjars/swagger-ui/index.html` hoặc gọi API trực tiếp qua Postman).
   - Truy cập endpoint đăng nhập của `identity-service` hoặc gọi một API đòi hỏi quyền truy cập nhưng truyền Token sai định dạng (hoặc rỗng).
   - Ví dụ: Gọi API lấy chi tiết order với ID không tồn tại hoặc không hợp lệ. Điều này sẽ kích hoạt lỗi `400 Bad Request` hoặc `401 Unauthorized` kèm theo dòng thông báo Exception trên Spring Boot.
2. **Bước 2 (Tìm kiếm lỗi trên Kibana)**: Quay lại màn hình **Kibana Discover**.
   - Tại thanh tìm kiếm, gõ từ khóa:
     ```kql
     log : "Exception" or log : "ERROR"
     ```
   - Nhấn **Enter**.
3. **Bước 3 (Phân tích nguyên nhân)**:
   - Click vào dấu mũi tên `>` ở đầu dòng log lỗi vừa tìm được để mở rộng chi tiết.
   - Chỉ ra cho người xem trường `log` chứa toàn bộ **Stacktrace** lỗi của Java Spring Boot cực kỳ trực quan và chi tiết.
   - Nhấn mạnh: *“Nhờ có EFK, nhà phát triển không cần phải truy cập SSH vào máy chủ Docker, không cần mở từng file log text thủ công của 11 microservices để mò lỗi, mà chỉ cần gõ tìm kiếm trên một màn hình duy nhất là ra ngay nguyên nhân sự cố!”*

---

### PHẦN 3: Tạo Dashboard Giám Sát Hệ Thống Chuyên Nghiệp (Kibana Dashboard)

*Mục tiêu: Biến các dữ liệu log thô thành các biểu đồ trực quan động cực kỳ hoành tráng để thuyết phục người xem.*

Chúng ta sẽ tạo một Dashboard gồm 2 biểu đồ quan trọng:
1. **Biểu đồ tròn (Pie Chart)**: Thể hiện tỉ lệ phân bố logs của các service (Dịch vụ nào hoạt động năng nổ hoặc có nhiều log nhất).
2. **Biểu đồ đường (Line Chart)**: Thể hiện biến động tần suất logs theo thời gian thực.

#### Các bước tạo Dashboard trên Kibana 8.x:

1. **Đi tới mục Dashboard**:
   - Ở Menu Sidebar bên trái, chọn **Analytics** -> **Dashboard**.
   - Click nút **Create dashboard** ở góc trên bên phải.
2. **Tạo Biểu đồ 1: Phân bố Logs theo Microservices (Pie Chart)**
   - Click nút **Create visualization**.
   - Tại bảng bên phải, ở ô chọn loại biểu đồ (mặc định là *Bar*), click chọn **Pie** (Biểu đồ tròn).
   - Kéo trường `container_name` từ danh sách trường bên trái thả vào ô **Slice by** (hoặc ô cấu hình trục ở giữa).
   - Kibana sẽ tự động tính toán và hiển thị một biểu đồ tròn tuyệt đẹp phân chia tỷ lệ log giữa các service như `api-gateway`, `identity-service`, `book-service`...
   - Click **Save and return** ở góc trên bên phải để đưa biểu đồ vào Dashboard.
3. **Tạo Biểu đồ 2: Tần suất phát sinh Logs theo thời gian (Line/Area Chart)**
   - Click tiếp **Create visualization** (hoặc kéo thả biểu đồ mới).
   - Chọn loại biểu đồ là **Line** (Biểu đồ đường) hoặc **Area** (Biểu đồ vùng).
   - Trục X: Chọn `@timestamp` (Mặc định Kibana sẽ tự chọn trục X là thời gian).
   - Trục Y: Chọn số lượng bản ghi (**Count**).
   - Tại phần **Break down by** (hoặc *Split series*), kéo thả trường `container_name` vào.
   - **Kết quả**: Bạn sẽ nhìn thấy các đường đồ thị biểu diễn tần suất logs nhảy số theo thời gian của từng service cực kỳ sinh động!
   - Click **Save and return** để lưu lại.
4. **Lưu và Đặt tên Dashboard**:
   - Sắp xếp vị trí 2 biểu đồ trên màn hình kéo thả cho cân đối và đẹp mắt.
   - Click nút **Save** ở góc trên bên phải.
   - Đặt tên Dashboard: `[BookLand] Centralized Logging Dashboard` và nhấn **Save**.

---

## LỜI KẾT DEMO
Khi kết thúc buổi demo, bạn có thể tổng kết bằng việc tóm tắt:
> *"Với giải pháp EFK Stack được thiết lập chuẩn chỉ, hệ thống vi dịch vụ BookLand giờ đây đã sở hữu một hạ tầng giám sát logs tập trung, có tính sẵn sàng cao, hoạt động bất đồng bộ không gây nghẽn dịch vụ, giúp đội ngũ vận hành dễ dàng phát hiện lỗi, truy vết giao dịch xuyên suốt qua các service và có một góc nhìn tổng quan thông qua các Dashboard giám sát trực quan sinh động."*
