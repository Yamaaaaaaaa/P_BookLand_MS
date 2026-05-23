# 16 — Lý thuyết Kubernetes trong Kiến trúc Microservice

> Tài liệu này cung cấp nền tảng lý thuyết vững chắc về Kubernetes (K8s) áp dụng cho hệ thống **BookLand Microservice**. Nó giải thích lý do tại sao cần dịch chuyển từ Docker Compose lên K8s, phân tích sâu các thành phần kiến trúc cốt lõi, cơ chế Service Discovery, cách thiết lập cấu hình và quản lý lưu trữ bền vững trong môi trường Cloud-Native.

---

## 1. Sự dịch chuyển từ Docker Compose lên Kubernetes (K8s)

Trong quá trình phát triển hệ thống `P_BookLand_MS`, ở **Phase 0** và các Phase nghiệp vụ, chúng ta đã dùng **Docker Compose** làm công cụ chính để chạy thử nghiệm hạ tầng và các microservices ở môi trường nội bộ (Development). Tuy nhiên, khi hệ thống bước vào giai đoạn vận hành thực tế (Production), Docker Compose bộc lộ nhiều hạn chế nghiêm trọng.

### 1.1 So sánh chi tiết Docker Compose và Kubernetes

| Tiêu chí so sánh | Docker Compose (Development) | Kubernetes (Production) |
| :--- | :--- | :--- |
| **Môi trường phù hợp** | Single-node (Chỉ chạy trên 1 máy tính vật lý/VM). | Multi-node (Cụm máy chủ gồm hàng chục, hàng trăm server vật lý/cloud). |
| **Tính sẵn sàng cao (HA)** | Không hỗ trợ sẵn. Nếu host bị hỏng phần cứng, toàn bộ hệ thống sập hoàn toàn. | Tự động phân phối các bản sao (Pods) trên nhiều máy chủ khác nhau để tránh SPOF. |
| **Khả năng tự hồi phục (Self-healing)** | Chỉ tự khởi động lại container bị crash (`restart: always`). Không phát hiện được lỗi treo app ở tầng ứng dụng. | Tích hợp Liveness và Readiness Probes để phát hiện ứng dụng bị treo (deadlock) và tự động thay thế bằng Pod mới. |
| **Cơ chế Auto-scaling** | Phải scale thủ công bằng lệnh shell. Không tự scale theo tải thực tế. | Tự động tăng/giảm số lượng Pod dựa trên mức sử dụng CPU, RAM, hoặc custom metrics thông qua **HPA (Horizontal Pod Autoscaler)**. |
| **Chiến lược Deploy không gián đoạn (Zero-downtime)** | Gây gián đoạn dịch vụ khi restart container để update code mới (dù có dùng `--scale` vẫn dễ bị mất gói tin). | Hỗ trợ **Rolling Update** (cập nhật cuốn chiếu từng phần) và **Canary Deployment** để deploy không có downtime. |
| **Quản lý Cấu hình và Bảo mật** | Dùng file `.env` hoặc truyền biến trực tiếp vào file YAML. Dễ lộ thông tin nhạy cảm. | Quản lý tập trung bằng **ConfigMap** và **Secret** (mã hóa Base64), cho phép update cấu hình không cần restart ứng dụng. |

---

## 2. Kiến trúc & Các thành phần cốt lõi của Kubernetes

Kubernetes hoạt động dưới dạng một cụm máy chủ (**Cluster**) được chia làm hai vai trò chính: **Control Plane (Master Node)** và **Worker Nodes**.

```
                           ┌───────────────────────────────┐
                           │      CONTROL PLANE (MASTER)   │
                           │                               │
                           │     ┌───────────────────┐     │
                           │     │    API Server     ├─────────────┐
                           │     └─────────┬─────────┘     │       │
                           │               │               │       │
                           │  ┌────────────┼────────────┐  │       │
                           │  │ Controller │ Scheduler  │  │       ▼
                           │  │ Manager    │            │  │   ┌───────┐
                           │  └────────────┴────────────┘  │   │ etcd  │
                           │                               │   └───────┘
                           └───────────────┬───────────────┘
                                           │
                   ┌───────────────────────┴───────────────────────┐
                   ▼                                               ▼
      ┌─────────────────────────┐                     ┌─────────────────────────┐
      │      WORKER NODE 1      │                     │      WORKER NODE 2      │
      │                         │                     │                         │
      │  ┌───────────────────┐  │                     │  ┌───────────────────┐  │
      │  │      Kubelet      │  │                     │  │      Kubelet      │  │
      │  └─────────┬─────────┘  │                     │  └─────────┬─────────┘  │
      │            ▼            │                     │            ▼            │
      │  ┌───────────────────┐  │                     │  ┌───────────────────┐  │
      │  │    Kube-Proxy     │  │                     │  │    Kube-Proxy     │  │
      │  └─────────┬─────────┘  │                     │  └─────────┬─────────┘  │
      │            ▼            │                     │            ▼            │
      │  ┌───────────────────┐  │                     │  ┌───────────────────┐  │
      │  │ Container Runtime │  │                     │  │ Container Runtime │  │
      │  │   (containerd)    │  │                     │  │   (containerd)    │  │
      │  └─────────┬─────────┘  │                     │  └─────────┬─────────┘  │
      │            ▼            │                     │            ▼            │
      │   [Pod-1]     [Pod-2]   │                     │   [Pod-3]     [Pod-4]   │
      └─────────────────────────┘                     └─────────────────────────┘
```

### 2.1 Control Plane (Bộ não điều khiển)
Chịu trách nhiệm quản lý toàn bộ trạng thái của Cluster, đưa ra quyết định lập lịch và xử lý các sự kiện:
*   **kube-apiserver**: Cổng tiếp nhận mọi yêu cầu điều khiển từ công cụ `kubectl` hoặc từ các thành phần khác. Nó là thành phần duy nhất giao tiếp trực tiếp với cơ sở dữ liệu Cluster.
*   **etcd**: Cơ sở dữ liệu dạng key-value, có tính nhất quán và sẵn sàng cao, lưu trữ toàn bộ dữ liệu cấu hình và trạng thái của Cluster.
*   **kube-scheduler**: Lập lịch phân bổ các Pod mới khởi tạo lên các Worker Node phù hợp dựa trên tài nguyên CPU/RAM còn trống và các ràng buộc cấu hình.
*   **kube-controller-manager**: Chạy các tiến trình controller nền để giám sát trạng thái hệ thống (ví dụ: đảm bảo số lượng Pod thực tế luôn bằng số lượng cấu hình mong muốn).

### 2.2 Worker Node (Nơi thực thi ứng dụng)
Là các máy chủ vật lý hoặc máy ảo chạy các container ứng dụng thực tế:
*   **kubelet**: Một Agent chạy trên từng Worker Node, chịu trách nhiệm nhận chỉ thị từ Control Plane và đảm bảo các container trong Pod được khởi chạy và hoạt động khỏe mạnh.
*   **kube-proxy**: Thành phần mạng quản lý cơ chế định tuyến, duy trì các rule mạng trên node để cho phép giao tiếp giữa các Pod và hỗ trợ Load Balancing cho Service.
*   **Container Runtime**: Phần mềm thực thi container (chúng ta dùng `containerd` - tiêu chuẩn hiện đại thay thế cho Docker Engine trên K8s).

---

## 3. Bản đồ ánh xạ tài nguyên Kubernetes cho BookLand

Khi đưa hệ thống **BookLand Microservice** lên Kubernetes, các khai báo hạ tầng tĩnh trong file `docker-compose.yml` sẽ được chuyển hóa thành các tài nguyên động (K8s Resources) khai báo bằng định dạng YAML.

```
┌────────────────────────────────────────────────────────────────────────┐
│                          KUBERNETES NAMESPACE: bookland                │
│                                                                        │
│  ┌──────────────────────┐  Inbound Traffic  ┌───────────────────────┐  │
│  │    Ingress Controller├──────────────────►│  Spring API Gateway  │  │
│  │   (Nginx / Traefik)  │                   │     (Deployment)      │  │
│  └──────────────────────┘                   └──────────┬────────────┘  │
│                                                        │               │
│                                     ┌──────────────────┴───────────────┐
│                                     ▼                                  │
│                        ┌────────────────────────┐                      │
│                        │   K8s ClusterIP DNS    │                      │
│                        └────────────┬───────────┘                      │
│                                     │                                  │
│               ┌─────────────────────┼─────────────────────┐            │
│               ▼                     ▼                     ▼            │
│      ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐   │
│      │  Book Service   │   │  Order Service  │   │  User Service   │   │
│      │  (Deployment)   │   │  (Deployment)   │   │  (Deployment)   │   │
│      └────────┬────────┘   └────────┬────────┘   └────────┬────────┘   │
│               │                     │                     │            │
│               ▼                     ▼                     ▼            │
│      ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐   │
│      │  Book-DB Service│   │ Order-DB Service│   │  User-DB Service│   │
│      │  (StatefulSet)  │   │  (StatefulSet)  │   │  (StatefulSet)  │   │
│      └────────┬────────┘   └────────┬────────┘   └────────┬────────┘   │
│               │                     │                     │            │
│               ▼                     ▼                     ▼            │
│      ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐   │
│      │  PV / PVC (Disk)│   │  PV / PVC (Disk)│   │  PV / PVC (Disk)│   │
│      └─────────────────┘   └─────────────────┘   └─────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

### 3.1 Namespace — Phân vùng dự án
Chúng ta tạo ra một Namespace riêng biệt tên là `bookland`. Namespace này giúp cô lập hoàn toàn tài nguyên của dự án BookLand với các dự án khác chạy chung trên cùng một cụm K8s, tránh xung đột tên Service hoặc rò rỉ bảo mật.

### 3.2 Pod — Đơn vị chạy Container ứng dụng
*   Một Pod là thực thể nhỏ nhất chứa một hoặc một nhóm container chung chia sẻ không gian mạng (Network namespace) và ổ đĩa (Volumes).
*   **Lưu ý quan trọng**: Pod có tính chất **tạm thời (ephemeral)**. Nó có thể bị xóa, bị thay đổi IP bất cứ lúc nào khi Node bị lỗi hoặc khi cập nhật phiên bản. Do đó, **không bao giờ deploy Pod trực tiếp** mà phải thông qua `Deployment` hoặc `StatefulSet`.

### 3.3 Deployment — Cho các dịch vụ không lưu trạng thái (Stateless Services)
*   **Định nghĩa**: Deployment là một tài nguyên Kubernetes quản lý vòng đời của các Pod chạy ứng dụng stateless (không lưu trạng thái) như API Gateway, Book Service, Identity Service...
*   **Cơ chế hoạt động**: Nó tự động duy trì số lượng bản sao mong muốn (`replicas`), theo dõi sức khỏe của các Pod, và thực hiện nâng cấp phiên bản không gián đoạn dịch vụ bằng cơ chế **Rolling Update** (cập nhật cuốn chiếu). Nếu một Pod bị treo hoặc crash, Deployment sẽ tự động hủy Pod cũ và khởi tạo Pod mới để thay thế.

### 3.4 StatefulSet — Cho các dịch vụ lưu trữ dữ liệu (Stateful Services)
*   **Định nghĩa**: Tương tự như Deployment, nhưng StatefulSet được thiết kế chuyên biệt cho các ứng dụng cần lưu trạng thái (stateful) như Database (MySQL, PostgreSQL, MongoDB), Message Broker (Kafka) hay Distributed Cache (Redis).
*   **Cơ chế hoạt động**: Các Pod được tạo bởi StatefulSet có định danh mạng ổn định, duy nhất và liên tục (ví dụ: `book-db-0`, `book-db-1`) kèm theo các ổ đĩa bền vững (PersistentVolume) riêng biệt gắn chặt với từng Pod theo số thứ tự đó. Khi Pod bị tái khởi động hoặc dịch chuyển sang Node khác, nó vẫn giữ nguyên tên miền định danh mạng và tiếp tục gắn đúng ổ đĩa lưu trữ cũ của nó.

### 3.5 Service — Đầu nối mạng ổn định (Stable Network Endpoint)
*   **Định nghĩa**: Vì các Pod có tính chất tạm thời và có thể thay đổi IP liên tục, Service được sinh ra để cung cấp một đầu nối mạng ổn định, đóng vai trò làm Load Balancer trước một nhóm các Pod.
*   **Cơ chế hoạt động**: Service cấp phát một IP tĩnh ảo nội bộ (`ClusterIP`) và tự động đăng ký một bản ghi tên miền (DNS) trong CoreDNS của Cluster. Khi API Gateway hoặc một microservice khác gọi tới tên miền của Service, Kube-proxy sẽ tự động nhận diện các IP Pod thực tế phía sau (thông qua cơ chế Endpoint) và cân bằng tải lượng truy cập xuống các Pod đó.

### 3.6 Ingress — Cổng đón nhận traffic từ Internet
*   **Định nghĩa**: Ingress là một tài nguyên cấp cao quản lý luồng traffic đi từ bên ngoài Internet vào bên trong Kubernetes Cluster.
*   **Cơ chế hoạt động**: Ingress hoạt động kết hợp với Ingress Controller (như Nginx Ingress, Traefik) để đóng vai trò như một Reverse Proxy và Gateway ở biên của Cluster. Nó cho phép cấu hình định tuyến thông minh dựa trên tên miền (Host-based, ví dụ: `bookland.local`) hoặc đường dẫn (Path-based, ví dụ: `/api/v1/auth/**` trỏ tới API Gateway, `/` trỏ tới React Frontend), đồng thời hỗ trợ cấu hình SSL/TLS, CORS và giới hạn dung lượng upload file.

---

## 4. Giải pháp Service Discovery: Sử dụng DNS Service Discovery thay thế Eureka

Hệ thống loại bỏ hoàn toàn **Spring Cloud Netflix Eureka** ra khỏi cả môi trường phát triển (Local/Docker Compose) lẫn môi trường vận hành (Kubernetes). Quyết định này mang lại sự tinh gọn tối đa cho mã nguồn và hạ tầng:
- Không còn Client-side Discovery phụ thuộc vào thư viện Java cồng kềnh.
- Không tiêu tốn tài nguyên (RAM, CPU) để chạy các Eureka Server độc lập.
- Đồng nhất giải pháp Service Discovery ở tất cả môi trường dựa trên tiêu chuẩn **phân giải tên miền (DNS)**.

### 4.1 Cơ chế hoạt động trên các môi trường

```
MÔ HÌNH A: TRÊN DOCKER COMPOSE (LOCAL)                    MÔ HÌNH B: TRÊN KUBERNETES (PRODUCTION)
(Docker Engine DNS)                                      (K8s CoreDNS + Kube-Proxy)

┌──────────────────────────────────────┐               ┌──────────────────────────────────────┐
│          DOCKER ENGINE DNS           │               │      CORE-DNS / KUBE-PROXY (K8S)     │
└──────────────────▲───────────────────┘               └──────────────────▲───────────────────┘
   Tự động         │    Query IP                          Tự động         │    Query DNS
   Map tên container│    "http://book-service"            Map K8s Service │    "http://book-service"
┌──────────────────┴───┐  ┌────────────┐               ┌──────────────────┴───┐  ┌────────────┐
│  book-service        │  │api-gateway │               │   Book Service Pod   │  │API Gateway │
│  (Container)         │  │(Container) │               │  (K8s Deployment)    │  │   Pod      │
└──────────────────────┘  └────────────┘               └──────────────────────┘  └─────┬──────┘
                                                                                        │ Load Balance
                                                                                        ▼ (Kube-Proxy)
                                                                                ┌──────────────┐
                                                                                │ Book Pods    │
                                                                                └──────────────┘
```

### 4.2 Lợi ích của việc loại bỏ Eureka
1. **Loại bỏ lock-in công nghệ:** Dự án không bị phụ thuộc vào Spring Cloud Netflix Stack. Bất kỳ service nào viết bằng Node.js, Python, Go... đều có thể tham gia vào hệ thống và gọi chéo nhau thông qua giao tiếp REST/DNS tiêu chuẩn mà không cần viết code đăng ký client.
2. **Tiết kiệm tài nguyên:** Không cần cấp phát tài nguyên chạy các bản sao Eureka Server để đảm bảo High Availability (HA).
3. **Cấu hình Feign Client thống nhất:**
   Trong mã nguồn Spring Boot, cấu hình Feign Client gọi chéo service sẽ cực kỳ đơn giản và đồng nhất:
   ```yaml
   # Ở bất kỳ môi trường nào (Docker Compose hay Kubernetes)
   services:
     book:
       url: http://book-service:8083
   ```
   *   Ở Local: Tên miền `book-service` sẽ phân giải ra IP container của Book Service nhờ Docker DNS.
   *   Ở K8s: Tên miền `book-service` sẽ phân giải ra IP của K8s Service nhờ CoreDNS.

---

## 5. Quản lý Cấu hình & Bảo mật: ConfigMap và Secret

Trên Kubernetes, chúng ta thay thế hoàn toàn file `.env` bằng sự kết hợp giữa **ConfigMap** và **Secret**.

### 5.1 Các thành phần quản lý cấu hình
*   **ConfigMap**: Lưu trữ dữ liệu cấu hình dạng key-value thông thường (như cấu hình JPA, các đường dẫn DNS Services, log level).
*   **Secret**: Lưu trữ dữ liệu nhạy cảm được mã hóa Base64 (như mật khẩu cơ sở dữ liệu, JWT Secret Key, thông tin tài khoản SMTP gửi mail).
*   **Cơ chế hoạt động**: Khi Pod khởi chạy, K8s sẽ đọc ConfigMap/Secret và chuyển đổi chúng thành **biến môi trường (Environment Variables)** bên trong container hoặc mount chúng thành các file cấu hình vật lý nằm trong container.

### 5.2 Luồng tiêm cấu hình vào ứng dụng Spring Boot

```
[ Cấu hình thô ngoài K8s ]   ──►   [ Nạp vào K8s Cluster ]   ──►   [ Tiêm vào Pod Spring Boot ]

Mật khẩu DB: "rootpass"            Secret: bookland-secret         env: SPRING_DATASOURCE_PASSWORD
URL DB: "jdbc:mysql://..."         ConfigMap: bookland-config      env: SPRING_DATASOURCE_URL
```

Khi ứng dụng Spring Boot khởi chạy, nó sẽ ưu tiên đọc các biến môi trường hệ thống trước khi đọc file cấu hình `application.yml` tĩnh. K8s tận dụng đặc tính này để ghi đè các cấu hình động mà không cần rebuild Docker image:

1.  Chúng ta khai báo các biến môi trường trong `application.yml` dạng placeholder:
    ```yaml
    spring:
      datasource:
        url: ${DB_URL}
        username: ${DB_USERNAME}
        password: ${DB_PASSWORD}
    ```
2.  Trong manifest triển khai K8s, chúng ta liên kết các placeholder này với ConfigMap/Secret:
    ```yaml
    env:
      - name: DB_URL
        valueFrom:
          configMapKeyRef:
            name: bookland-config
            key: BOOK_DB_URL
      - name: DB_USERNAME
        valueFrom:
          secretKeyRef:
            name: bookland-secret
            key: DB_USERNAME
      - name: DB_PASSWORD
        valueFrom:
          secretKeyRef:
            name: bookland-secret
            key: DB_PASSWORD
    ```

Cơ chế này mang lại sự bảo mật tuyệt đối (mật khẩu không bao giờ được ghi đè hay commit lên Git) và tính linh hoạt cao (khi đổi mật khẩu database, chỉ cần update K8s Secret và trigger reload).

---

## 6. Lưu trữ bền vững với PersistentVolume (PV) & PersistentVolumeClaim (PVC)

Vì dữ liệu cơ sở dữ liệu hoặc file upload cần được lưu trữ lâu dài kể cả khi Pod bị crash hay xóa đi, Kubernetes cung cấp cơ chế quản lý ổ đĩa trừu tượng:

*   **PersistentVolume (PV)**: Một phân vùng ổ đĩa lưu trữ thực tế do Admin hệ thống tạo ra hoặc được cấp phát động từ Cloud Provider (ví dụ: AWS EBS, Google Persistent Disk, hoặc thư mục local trên VM).
*   **PersistentVolumeClaim (PVC)**: Yêu cầu xin cấp phát dung lượng đĩa của lập trình viên. Pod sẽ khai báo PVC (ví dụ: "Tôi cần 10GB ổ đĩa SSD"). K8s sẽ tự động tìm kiếm PV phù hợp để liên kết (**Bind**) với PVC đó.

---

*← [15 - Kim chỉ nam triển khai](./15-master-implementation-guide.md) | [17 - Hướng dẫn triển khai K8s →](./17-kubernetes-deployment-guide.md)*
