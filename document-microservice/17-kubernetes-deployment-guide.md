# 17 — Hướng dẫn triển khai thực tế trên Kubernetes

> Tài liệu này là **hướng dẫn thực chiến (Actionable Guide)** chi tiết từng bước để triển khai toàn bộ hệ thống **BookLand Microservice** lên cụm Kubernetes (K8s). Nó bao gồm đầy đủ sơ đồ triển khai, các manifest YAML mẫu cho cơ sở dữ liệu, dịch vụ hạ tầng, microservice mẫu, cổng API Gateway, ứng dụng Frontend, Ingress Controller và các bước kiểm tra, khắc phục sự cố thực tế.

---

## 1. Sơ đồ luồng triển khai tổng thể trên Kubernetes

Dưới đây là kiến trúc vật lý của hệ thống khi chạy bên trong Kubernetes Cluster:

```
                                [ TRAFFIC FROM INTERNET ]
                                            │
                                            ▼ (Port 80 / 443)
                            ┌────────────────────────────────┐
                            │    NGINX INGRESS CONTROLLER    │
                            └───────────────┬────────────────┘
                                            │
                    ┌───────────────────────┴───────────────────────┐
             / (Path: Root)                                         │ /api/v1/* (Path: API)
                    ▼                                               ▼
      ┌───────────────────────────┐                   ┌───────────────────────────┐
      │   bookland-fe-service     │                   │    api-gateway-service    │
      │       (ClusterIP)         │                   │       (ClusterIP)         │
      └─────────────┬─────────────┘                   └─────────────┬─────────────┘
                    │                                               │
                    ▼ (Routing)                                     ▼ (Routing chéo qua K8s DNS)
              [bookland-fe]                               ┌─────────┴─────────┐
             (Frontend Pods)                              ▼                   ▼
                                                ┌─────────────────┐ ┌─────────────────┐
                                                │identity-service │ │  book-service   │
                                                │     Pods        │ │     Pods        │
                                                └────────┬────────┘ └────────┬────────┘
                                                         │                   │
                                                         ▼ (ClusterIP DB)    ▼ (ClusterIP DB)
                                                ┌─────────────────┐ ┌─────────────────┐
                                                │   identity-db   │ │     book-db     │
                                                │  (StatefulSet)  │ │  (StatefulSet)  │
                                                └─────────────────┘ └─────────────────┘
```

---

## 2. Chuẩn bị Hạ tầng & Thiết lập Máy chủ (Server Setup)

Để triển khai hệ thống **BookLand Microservice**, bạn cần chuẩn bị môi trường chạy các dịch vụ (K8s Cluster) và tổ chức các file cấu hình một cách khoa học.

### 2.1 Cấu trúc thư mục dự án (Làm ở đâu?)

Chúng ta sẽ quản lý toàn bộ cấu hình triển khai Kubernetes tập trung bên trong thư mục `k8s/` đặt tại **gốc (root) của dự án `P_BookLand_MS`**. Việc này giúp tách biệt hạ tầng với mã nguồn và dễ dàng kiểm soát phiên bản qua Git.

Hãy tạo cấu trúc thư mục như sau:
```text
P_BookLand_MS/                  # Thư mục gốc dự án
├── services/                   # Chứa mã nguồn các microservices (Java Spring Boot, React FE...)
├── document-microservice/      # Thư mục tài liệu hướng dẫn này
└── k8s/                        # [TẠO MỚI] Thư mục chứa toàn bộ cấu hình Kubernetes
    ├── 01-init/
    │   └── 01-namespace-secrets.yaml   # Cấu hình Namespace & Secret dùng chung
    ├── 02-databases/
    │   └── 02-databases.yaml           # Cấu hình StatefulSets MySQL, MongoDB
    ├── 03-middleware/
    │   └── 03-middleware.yaml          # Cấu hình Kafka, Redis
    ├── 04-apps/
    │   └── 04-book-service.yaml        # Cấu hình Deployments & Services cho app (ví dụ Book Service)
    ├── 05-gateway-frontend/
    │   └── 05-gateway-frontend.yaml    # Cấu hình API Gateway & React Frontend
    └── 06-ingress/
        └── 06-ingress.yaml             # Cấu hình Nginx Ingress điều hướng mạng biên
```
*Tất cả các lệnh triển khai (`kubectl`) sẽ được chạy từ thư mục gốc `P_BookLand_MS` hoặc bên trong thư mục `k8s/`.*

---

### 2.2 Thiết lập Kubernetes Cluster (Server Setup thế nào?)

Theo mô hình hạ tầng của bạn, chúng ta sẽ thiết lập cụm K8s chạy trên **hai loại máy chủ ảo riêng biệt**: máy ảo **Ubuntu Server chạy bằng Oracle VM VirtualBox** tại Local và **máy ảo VPS Cloud** bên ngoài khi triển khai thực tế.

#### 💻 PHƯƠNG ÁN A: Thiết lập trên máy ảo Local (Oracle VM VirtualBox - Ubuntu Server)

Phương án này chạy thử nghiệm trực tiếp trên máy tính cá nhân của bạn thông qua một máy ảo Ubuntu Server 22.04 LTS được cấu hình giả lập máy chủ thật.

##### Bước 1: Cấu hình mạng Bridged Adapter trong VirtualBox (Bắt buộc)
Để hệ điều hành Windows Host có thể giao tiếp trực tiếp với cụm Kubernetes chạy bên trong máy ảo Guest (Ubuntu Server), bạn cần thiết lập mạng máy ảo theo dạng cầu nối:

1. **Cấu hình card mạng máy ảo**:
   * Tắt máy ảo Ubuntu.
   * Mở VirtualBox -> Chọn máy ảo Ubuntu -> Nhấp vào **Settings** -> Chọn tab **Network** -> Chọn **Adapter 1**.
   * Tích chọn **Enable Network Adapter**.
   * Tại ô **Attached to**, chọn **Bridged Adapter**.
   * Tại ô **Name**, chọn đúng card mạng thực tế máy Windows đang dùng để kết nối Internet (ví dụ: card Wifi nếu kết nối không dây, hoặc card Ethernet/Realtek nếu kết nối dây).
2. **Khởi động máy ảo và lấy địa chỉ IP**:
   * Bật máy ảo lên, đăng nhập và chạy lệnh:
     ```bash
     ip a
     ```
   * Tìm IP nội mạng của máy ảo (ví dụ: `192.168.1.50`). IP này sẽ do Router/Modem mạng của bạn cấp phát tự động, giúp máy ảo hoạt động như một thiết bị vật lý độc lập trong mạng nội bộ.

##### Bước 2: Cài đặt Docker Engine bên trong máy ảo Ubuntu
SSH vào máy ảo của bạn (hoặc thao tác trực tiếp trên giao diện console) và chạy:
```bash
sudo apt update
sudo apt install docker.io -y
sudo systemctl enable --now docker
# Thêm user hiện tại vào group docker để không cần gõ sudo khi chạy lệnh docker
sudo usermod -aG docker $USER
newgrp docker
```

##### Bước 3: Cài đặt kubectl và Minikube bên trong máy ảo
```bash
# 1. Cài đặt kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# 2. Cài đặt Minikube
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
sudo install minikube-linux-amd64 /usr/local/bin/minikube
```

##### Bước 4: Khởi động Minikube bên trong máy ảo
Hãy chắc chắn rằng trong cài đặt VirtualBox, bạn đã cấp cho máy ảo này tối thiểu **4 CPU Cores** và **8GB RAM**:
```bash
minikube start --driver=docker --cpus=4 --memory=8192
minikube enable ingress
```

##### Bước 5: Định tuyến Traffic từ cổng của Máy ảo vào Ingress của Minikube
Bản thân Ingress Controller trong Minikube sử dụng dải IP nội bộ chỉ có thể truy cập từ bên trong máy ảo. Để truy cập từ máy Windows Host, chúng ta phải forward traffic đi qua cổng `80/443` của máy ảo trực tiếp vào Ingress:
```bash
# Lấy IP nội bộ của Ingress Service trong cluster
INGRESS_IP=$(kubectl get svc -n ingress-nginx ingress-nginx-controller -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

# Thiết lập iptables chuyển tiếp luồng mạng
sudo iptables -t nat -A PREROUTING -p tcp --dport 80 -j DNAT --to-destination $INGRESS_IP:80
sudo iptables -t nat -A PREROUTING -p tcp --dport 443 -j DNAT --to-destination $INGRESS_IP:443
```

##### Bước 6: Cấu hình phân giải tên miền trên máy Windows Host
1. Trên máy tính Windows của bạn, mở công cụ **Notepad** dưới quyền quản trị viên (**Run as Administrator**).
2. Mở file hosts tại đường dẫn: `C:\Windows\System32\drivers\etc\hosts`
3. Thêm dòng cấu hình ánh xạ IP thực tế của máy ảo VirtualBox (ví dụ IP máy ảo của bạn là `192.168.1.50`):
   ```text
   192.168.1.50  bookland.local
   ```
4. Lưu tệp hosts lại. Bây giờ, bạn có thể mở bất kỳ trình duyệt nào trên Windows và truy cập trực tiếp hệ thống tại địa chỉ: `http://bookland.local`.

---

#### ☁️ PHƯƠNG ÁN B: Thiết lập trên Server ảo riêng bên ngoài (External Cloud VPS - Ubuntu 22.04 LTS)

Phương án này áp dụng khi bạn triển khai chạy thực tế trên một Server Cloud VPS mua ngoài (như DigitalOcean, Linode, Vultr, AWS EC2...) chạy hệ điều hành Ubuntu 22.04 LTS có IP Public tĩnh.

##### Bước 1: Yêu cầu tài nguyên VPS tối thiểu
*   **CPU**: 4 vCPUs.
*   **RAM**: 8GB RAM trở lên.
*   **Disk**: 40GB SSD.
*   **IP**: Có IP Public tĩnh để truy cập từ internet.

##### Bước 2: Cài đặt Docker Engine & các công cụ quản trị (kubectl, Minikube)
SSH vào VPS Cloud của bạn bằng terminal (`ssh root@<IP_VPS_PUBLIC>`) và thực hiện cài đặt:
```bash
# 1. Cài đặt Docker
sudo apt update
sudo apt install docker.io -y
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
newgrp docker

# 2. Cài đặt kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# 3. Cài đặt Minikube
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
sudo install minikube-linux-amd64 /usr/local/bin/minikube
```

##### Bước 3: Khởi động Minikube & Bật Ingress Controller
```bash
minikube start --driver=docker --cpus=4 --memory=8192
minikube enable ingress
```

##### Bước 4: Thiết lập Tường lửa (UFW Firewall) để bảo mật VPS
Mở các cổng mạng an toàn trên VPS, chặn các truy cập nguy hiểm vào cơ sở dữ liệu nội bộ:
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp     # Cổng SSH quản trị
sudo ufw allow 80/tcp     # Cổng HTTP cho web
sudo ufw allow 443/tcp    # Cổng HTTPS bảo mật
sudo ufw enable           # Bật tường lửa
```

##### Bước 5: Ánh xạ Traffic từ IP Public của VPS vào Minikube Ingress
Thực hiện chuyển tiếp luồng mạng đi vào cổng công khai của VPS sang IP Ingress của Cluster:
```bash
# Lấy IP Ingress nội bộ
INGRESS_IP=$(kubectl get svc -n ingress-nginx ingress-nginx-controller -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

# Ánh xạ luồng
sudo iptables -t nat -A PREROUTING -p tcp --dport 80 -j DNAT --to-destination $INGRESS_IP:80
sudo iptables -t nat -A PREROUTING -p tcp --dport 443 -j DNAT --to-destination $INGRESS_IP:443
```
*(Để duy trì cấu hình iptables này kể cả khi khởi động lại VPS, khuyên dùng gói cài đặt `sudo apt install iptables-persistent` và lưu lại cấu hình)*.

##### Bước 6: Trỏ tên miền thực tế (hoặc sửa file hosts) để truy cập
*   **Nếu có Tên miền thực tế**: Vào trang quản lý DNS tên miền của bạn (ví dụ Cloudflare), trỏ bản ghi **A Record** tên miền `bookland.xyz` về địa chỉ **IP Public thực tế của VPS**.
*   **Nếu dùng file hosts để test**: Thêm vào file hosts trên máy tính Windows cá nhân:
    ```text
    <IP_PUBLIC_CỦA_VPS>  bookland.local
    ```
    Sau đó truy cập qua trình duyệt máy cá nhân.

---

### 2.3 Quy trình Build & Đẩy Container Images lên Registry

Trước khi có thể triển khai ứng dụng lên Kubernetes, bạn phải đóng gói mã nguồn của các microservice thành các **Docker Image** và đẩy chúng lên một trung tâm quản lý ảnh (Container Registry) như **Docker Hub**, **GitHub Packages**, hoặc **AWS ECR**.

#### Bước 1: Biên dịch mã nguồn Java Spring Boot thành file JAR
Di chuyển vào từng thư mục microservice trong `services/` (ví dụ: `services/book-service`) và chạy lệnh biên dịch (đảm bảo máy đã cài JDK 17+ và Maven/Gradle):
```bash
# Đối với Maven:
mvn clean package -DskipTests

# Đối với Gradle:
./gradlew clean bootJar
```

#### Bước 2: Build Docker Image từ Dockerfile
Viết file `Dockerfile` cơ bản đặt tại gốc của từng service (ví dụ: `services/book-service/Dockerfile`):
```dockerfile
FROM eclipse-temurin:17-jre-alpine
VOLUME /tmp
ARG JAR_FILE=target/*.jar
COPY ${JAR_FILE} app.jar
ENTRYPOINT ["java","-jar","/app.jar"]
```
Tiến hành build ảnh (sử dụng tài khoản Docker Hub của bạn, ví dụ tên tài khoản là `booklanddev`):
```bash
docker build -t booklanddev/book-service:1.0.0 ./services/book-service
```

#### Bước 3: Đăng nhập và Đẩy Image lên Registry công khai (Public Registry)
```bash
# Đăng nhập vào tài khoản Docker Hub
docker login

# Đẩy ảnh lên
docker push booklanddev/book-service:1.0.0
```

#### Bước 4: Xử lý bảo mật nếu dùng kho lưu trữ riêng tư (Private Registry)
Nếu bạn muốn bảo mật mã nguồn và lưu trữ ảnh trong kho riêng tư (Private Repository), Kubernetes sẽ không thể tự do kéo ảnh về nếu không được cấp quyền.

1.  **Tạo một K8s Secret chứa thông tin đăng nhập Registry**:
    ```bash
    kubectl create secret docker-registry bookland-regcred \
      --docker-server=https://index.docker.io/v1/ \
      --docker-username=YOUR_DOCKER_USERNAME \
      --docker-password=YOUR_DOCKER_PASSWORD_OR_TOKEN \
      --docker-email=YOUR_EMAIL \
      -n bookland
    ```
2.  **Khai báo quyền kéo ảnh (`imagePullSecrets`) vào các file manifest YAML triển khai**:
    Trong các file YAML Deployment (ví dụ ở Bước 4 dưới đây), bạn phải bổ sung cấu hình ở phần `spec.template.spec`:
    ```yaml
    spec:
      template:
        spec:
          imagePullSecrets:
            - name: bookland-regcred  # Trỏ tới Secret bảo mật vừa tạo ở trên
          containers:
            - name: book-service
              image: booklanddev/book-service:1.0.0  # URL ảnh riêng tư
    ```

---

## 3. Các bước triển khai chi tiết

### 📌 BƯỚC 1: Khởi tạo Namespace & Cấu hình bảo mật (Secrets)

Chúng ta cần tạo không gian tên cô lập `bookland` và nạp trước các cấu hình bảo mật nhạy cảm (như mật khẩu cơ sở dữ liệu, JWT secret) vào hệ thống dưới dạng **Secrets**.

Tạo file `01-namespace-secrets.yaml`:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: bookland
---
apiVersion: v1
kind: Secret
metadata:
  name: bookland-secrets
  namespace: bookland
type: Opaque
stringData:
  # Mật khẩu gốc cho các database MySQL
  MYSQL_ROOT_PASSWORD: "root"
  # Mật khẩu cho Redis
  REDIS_PASSWORD: "bookland123"
  # Khóa bảo mật JWT dùng chung cho Identity Service và API Gateway
  JWT_SECRET_KEY: "PBookLandMSSecretKeyForJWTAuthTokenGenerations1234567890"
  # MinIO credentials
  MINIO_ACCESS_KEY: "bookland"
  MINIO_SECRET_KEY: "bookland123"
```

Chạy lệnh triển khai:
```bash
kubectl apply -f 01-namespace-secrets.yaml
```

---

### 📌 BƯỚC 2: Cài đặt và Triển khai Lớp Cơ sở dữ liệu (Database Layer)

Hệ thống BookLand Microservice tuân thủ triệt để nguyên tắc **Database per Service**. Ở môi trường K8s, ta sẽ deploy các database dưới dạng **StatefulSet** phối hợp với **PersistentVolumeClaim (PVC)** để bảo toàn dữ liệu. 

Để đơn giản hóa và dễ chạy thử nghiệm (ví dụ trên Minikube), chúng ta sử dụng **StorageClass mặc định** để cấp phát dung lượng tự động.

Tạo file `02-databases.yaml`:

```yaml
# ========================================================
# DATABASE CHO BOOK SERVICE (Ví dụ tiêu biểu cho MySQL)
# ========================================================
apiVersion: v1
kind: Service
metadata:
  name: book-db
  namespace: bookland
spec:
  ports:
    - port: 3306
  selector:
    app: book-db
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: book-db
  namespace: bookland
spec:
  serviceName: book-db
  replicas: 1
  selector:
    matchLabels:
      app: book-db
  template:
    metadata:
      labels:
        app: book-db
    spec:
      containers:
        - name: mysql
          image: mysql:8.0
          env:
            - name: MYSQL_DATABASE
              value: "book_db"
            - name: MYSQL_ROOT_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: bookland-secrets
                  key: MYSQL_ROOT_PASSWORD
          ports:
            - containerPort: 3306
              name: mysql
          volumeMounts:
            - name: book-db-storage
              mountPath: /var/lib/mysql
  volumeClaimTemplates:
    - metadata:
        name: book-db-storage
      spec:
        accessModes: [ "ReadWriteOnce" ]
        resources:
          requests:
            storage: 2Gi
---
# ========================================================
# MONGO DATABASE CHO NOTIFICATION SERVICE
# ========================================================
apiVersion: v1
kind: Service
metadata:
  name: notification-db
  namespace: bookland
spec:
  ports:
    - port: 27017
  selector:
    app: notification-db
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: notification-db
  namespace: bookland
spec:
  serviceName: notification-db
  replicas: 1
  selector:
    matchLabels:
      app: notification-db
  template:
    metadata:
      labels:
        app: notification-db
    spec:
      containers:
        - name: mongodb
          image: mongo:7.0
          env:
            - name: MONGO_INITDB_ROOT_USERNAME
              value: "root"
            - name: MONGO_INITDB_ROOT_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: bookland-secrets
                  key: MYSQL_ROOT_PASSWORD
            - name: MONGO_INITDB_DATABASE
              value: "notification_db"
          ports:
            - containerPort: 27017
              name: mongodb
          volumeMounts:
            - name: mongo-storage
              mountPath: /data/db
  volumeClaimTemplates:
    - metadata:
        name: mongo-storage
      spec:
        accessModes: [ "ReadWriteOnce" ]
        resources:
          requests:
            storage: 2Gi
```
*(Ghi chú: Lập trình viên tự viết các file StatefulSet tương tự cho `identity-db`, `user-db`, `order-db`, `event-db` dựa trên template MySQL ở trên, chỉ thay đổi tên Database và tên Service/StatefulSet).*

---

### 📌 BƯỚC 3: Cài đặt Hạ tầng Message Broker & Cache (Kafka & Redis)

Hệ thống sử dụng **Redis** làm Distributed Cache và **Kafka** cho Event-driven communication.

Tạo file `03-middleware.yaml`:

```yaml
# ========================================================
# REDIS Triển khai (Stateless Spec đơn giản cho Cache)
# ========================================================
apiVersion: v1
kind: Service
metadata:
  name: redis
  namespace: bookland
spec:
  ports:
    - port: 6379
  selector:
    app: redis
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: bookland
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
        - name: redis
          image: redis:7-alpine
          command: ["sh", "-c", "redis-server --requirepass $REDIS_PASSWORD"]
          env:
            - name: REDIS_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: bookland-secrets
                  key: REDIS_PASSWORD
          ports:
            - containerPort: 6379
---
# ========================================================
# APACHE KAFKA + ZOOKEEPER (Đơn giản hóa cho Dev/Staging K8s)
# ========================================================
apiVersion: v1
kind: Service
metadata:
  name: zookeeper
  namespace: bookland
spec:
  ports:
    - port: 2181
  selector:
    app: zookeeper
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: zookeeper
  namespace: bookland
spec:
  replicas: 1
  selector:
    matchLabels:
      app: zookeeper
  template:
    metadata:
      labels:
        app: zookeeper
    spec:
      containers:
        - name: zookeeper
          image: confluentinc/cp-zookeeper:7.5.0
          env:
            - name: ZOOKEEPER_CLIENT_PORT
              value: "2181"
            - name: ZOOKEEPER_TICK_TIME
              value: "2000"
          ports:
            - containerPort: 2181
---
apiVersion: v1
kind: Service
metadata:
  name: kafka
  namespace: bookland
spec:
  ports:
    - port: 9092
  selector:
    app: kafka
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kafka
  namespace: bookland
spec:
  replicas: 1
  selector:
    matchLabels:
      app: kafka
  template:
    metadata:
      labels:
        app: kafka
    spec:
      containers:
        - name: kafka
          image: confluentinc/cp-kafka:7.5.0
          env:
            - name: KAFKA_BROKER_ID: 1
            - name: KAFKA_ZOOKEEPER_CONNECT
              value: "zookeeper:2181"
            - name: KAFKA_ADVERTISED_LISTENERS
              value: "PLAINTEXT://kafka:9092"
            - name: KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR
              value: "1"
            - name: KAFKA_TRANSACTION_STATE_LOG_MIN_ISR
              value: "1"
            - name: KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR
              value: "1"
          ports:
            - containerPort: 9092
```

Chạy lệnh triển khai các tài nguyên trên:
```bash
kubectl apply -f 02-databases.yaml -f 03-middleware.yaml
```

---

### 📌 BƯỚC 4: Triển khai các Spring Boot Microservice (Stateless Layer)

Chúng ta sẽ tạo các manifest Deployments & Services cho từng service. Để đảm bảo khả năng sẵn sàng cao và tự hồi phục, chúng ta bắt buộc phải cấu hình:
1.  **Resource Limits**: Tránh việc một Pod bị rò rỉ bộ nhớ (memory leak) làm sập toàn bộ Node.
2.  **Liveness & Readiness Probes**: Tận dụng các endpoint Actuator của Spring Boot `/actuator/health/liveness` và `/actuator/health/readiness` để K8s kiểm tra sức khỏe của ứng dụng.
3.  **Horizontal Pod Autoscaler (HPA)**: Tự động scale dựa trên tải CPU thực tế.

Dưới đây là file manifest mẫu đầy đủ cho `book-service`. Tạo file `04-book-service.yaml`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: book-service-config
  namespace: bookland
data:
  # Cấu hình kết nối DB nội bộ cluster qua DNS book-db
  SPRING_DATASOURCE_URL: "jdbc:mysql://book-db:3306/book_db?useSSL=false&allowPublicKeyRetrieval=true"
  SPRING_DATASOURCE_USERNAME: "root"
  # Cấu hình Kafka nội bộ cluster
  SPRING_KAFKA_BOOTSTRAP_SERVERS: "kafka:9092"
---
apiVersion: v1
kind: Service
metadata:
  name: book-service
  namespace: bookland
  labels:
    app: book-service
spec:
  type: ClusterIP
  ports:
    - port: 8083
      targetPort: 8083
      protocol: TCP
  selector:
    app: book-service
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: book-service
  namespace: bookland
spec:
  replicas: 2 # Chạy tối thiểu 2 instances để đảm bảo tính HA
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1       # Cho phép tạo thêm tối đa 1 Pod mới trong quá trình update
      maxUnavailable: 0 # Đảm bảo không có Pod nào bị offline khi đang update
  selector:
    matchLabels:
      app: book-service
  template:
    metadata:
      labels:
        app: book-service
    spec:
      containers:
        - name: book-service
          # Thay bằng địa chỉ Registry thực tế chứa Docker Image đã build
          image: bookland/book-service:latest
          imagePullPolicy: Always
          ports:
            - containerPort: 8083
          envFrom:
            - configMapRef:
                name: book-service-config
          env:
            # Lấy mật khẩu DB từ Secret đã nạp ở Bước 1
            - name: SPRING_DATASOURCE_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: bookland-secrets
                  key: MYSQL_ROOT_PASSWORD
          resources:
            requests:
              cpu: "250m"      # Đặt trước 0.25 CPU
              memory: "512Mi"  # Đặt trước 512MB RAM
            limits:
              cpu: "500m"      # Giới hạn tối đa 0.5 CPU
              memory: "1024Mi" # Giới hạn tối đa 1GB RAM (nếu vượt quá Pod sẽ bị OOMKilled)
          # Kiểm tra xem ứng dụng còn sống không (nếu fail -> restart container)
          livenessProbe:
            httpGet:
              path: /actuator/health/liveness
              port: 8083
            initialDelaySeconds: 40 # Chờ app khởi động 40s mới bắt đầu check
            periodSeconds: 15       # Tần suất check 15s một lần
          # Kiểm tra xem ứng dụng đã sẵn sàng tiếp nhận traffic chưa (nếu fail -> ngắt khỏi Service)
          readinessProbe:
            httpGet:
              path: /actuator/health/readiness
              port: 8083
            initialDelaySeconds: 40
            periodSeconds: 10
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: book-service-hpa
  namespace: bookland
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: book-service
  minReplicas: 2
  maxReplicas: 5 # Scale lên tối đa 5 Pods nếu quá tải
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 75 # Tự động scale nếu trung bình sử dụng CPU > 75%
```

Áp dụng triển khai:
```bash
kubectl apply -f 04-book-service.yaml
```

*(Lập trình viên viết các file tương tự cho `identity-service`, `user-service`, `order-service`... Cấu hình trỏ database tương ứng và inject port chuẩn của từng service).*

---

### 📌 BƯỚC 5: Triển khai Cổng API Gateway & React Frontend

API Gateway đóng vai trò điều phối định tuyến luồng gọi nội bộ, còn Frontend phục vụ giao diện người dùng.

Tạo file `05-gateway-frontend.yaml`:

```yaml
# ========================================================
# TRIP KHAI SPRING CLOUD API GATEWAY
# ========================================================
apiVersion: v1
kind: ConfigMap
metadata:
  name: api-gateway-config
  namespace: bookland
data:
  # Định tuyến tĩnh qua K8s Service DNS (Eureka đã được loại bỏ hoàn toàn)
  SPRING_CLOUD_GATEWAY_ROUTES_0_ID: "book-service"
  SPRING_CLOUD_GATEWAY_ROUTES_0_URI: "http://book-service:8083"
  SPRING_CLOUD_GATEWAY_ROUTES_0_PREDICATES_0: "Path=/api/v1/books/**"
  
  SPRING_CLOUD_GATEWAY_ROUTES_1_ID: "identity-service"
  SPRING_CLOUD_GATEWAY_ROUTES_1_URI: "http://identity-service:8081"
  SPRING_CLOUD_GATEWAY_ROUTES_1_PREDICATES_0: "Path=/api/v1/auth/**"
  
  SPRING_DATA_REDIS_HOST: "redis"
  SPRING_DATA_REDIS_PORT: "6379"
---
apiVersion: v1
kind: Service
metadata:
  name: api-gateway
  namespace: bookland
spec:
  type: ClusterIP
  ports:
    - port: 8080
      targetPort: 8080
  selector:
    app: api-gateway
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
  namespace: bookland
spec:
  replicas: 2
  selector:
    matchLabels:
      app: api-gateway
  template:
    metadata:
      labels:
        app: api-gateway
    spec:
      containers:
        - name: api-gateway
          image: bookland/api-gateway:latest
          ports:
            - containerPort: 8080
          envFrom:
            - configMapRef:
                name: api-gateway-config
          env:
            - name: SPRING_DATA_REDIS_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: bookland-secrets
                  key: REDIS_PASSWORD
            - name: JWT_SECRET
              valueFrom:
                secretKeyRef:
                  name: bookland-secrets
                  key: JWT_SECRET_KEY
          resources:
            requests:
              cpu: "100m"
              memory: "256Mi"
            limits:
              cpu: "500m"
              memory: "512Mi"
---
# ========================================================
# TRIP KHAI REACT FRONTEND (BOOKLAND_FE)
# ========================================================
apiVersion: v1
kind: Service
metadata:
  name: bookland-fe
  namespace: bookland
spec:
  type: ClusterIP
  ports:
    - port: 80
      targetPort: 80 # Nginx phục vụ static file trong container chạy port 80
  selector:
    app: bookland-fe
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: bookland-fe
  namespace: bookland
spec:
  replicas: 2
  selector:
    matchLabels:
      app: bookland-fe
  template:
    metadata:
      labels:
        app: bookland-fe
    spec:
      containers:
        - name: bookland-fe
          image: bookland/bookland-fe:latest
          ports:
            - containerPort: 80
          resources:
            requests:
              cpu: "50m"
              memory: "64Mi"
            limits:
              cpu: "200m"
              memory: "128Mi"
```

Áp dụng triển khai:
```bash
kubectl apply -f 05-gateway-frontend.yaml
```

---

### 📌 BƯỚC 6: Cấu hình Ingress Resource (Mở cổng truy cập ngoài)

Chúng ta sử dụng **NGINX Ingress Controller** để đón nhận traffic từ Internet, phân phối tên miền và định tuyến dựa trên Path.

1.  Cài đặt NGINX Ingress Controller (nếu chưa có trong cluster):
    ```bash
    # Nếu dùng Minikube, chạy lệnh:
    minikube enable ingress
    
    # Nếu dùng Helm cho Kubernetes thường:
    helm upgrade --install ingress-nginx ingress-nginx \
      --repo https://kubernetes.github.io/ingress-nginx \
      --namespace ingress-nginx --create-namespace
    ```
2.  Khai báo tài nguyên Ingress `06-ingress.yaml`:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: bookland-ingress
  namespace: bookland
  annotations:
    kubernetes.io/ingress.class: "nginx"
    # Tăng kích thước file upload tối đa qua Ingress lên 50MB (Cho File Service)
    nginx.ingress.kubernetes.io/proxy-body-size: "50m"
    # Cấu hình CORS cơ bản ở cổng biên
    nginx.ingress.kubernetes.io/enable-cors: "true"
spec:
  rules:
    # Cấu hình DNS trỏ về Cluster (ví dụ: bookland.local)
    - host: bookland.local
      http:
        paths:
          # Mọi request bắt đầu bằng /api/ sẽ được chuyển tiếp vào API Gateway
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: api-gateway
                port:
                  number: 8080
          # Các request còn lại (HTML/JS/CSS) trỏ về Frontend
          - path: /
            pathType: Prefix
            backend:
              service:
                name: bookland-fe
                port:
                  number: 80
```

Áp dụng triển khai:
```bash
kubectl apply -f 06-ingress.yaml
```

3.  Cấu hình file `hosts` cục bộ để test:
    *   Lấy IP của Ingress: `kubectl get ingress -n bookland` (Ví dụ ra IP: `192.168.49.2`).
    *   Mở file hosts trên Windows (`C:\Windows\System32\drivers\etc\hosts`) hoặc Linux/macOS (`/etc/hosts`).
    *   Thêm dòng sau:
        ```text
        192.168.49.2  bookland.local
        ```
    *   Bây giờ, bạn có thể truy cập hệ thống bằng trình duyệt tại: `http://bookland.local`.

---

## 4. Quy trình vận hành & Kiểm tra trạng thái triển khai

Sau khi apply tất cả các manifest, chạy các lệnh kiểm tra sau để xác nhận hệ thống chạy ổn định:

1.  **Kiểm tra trạng thái các Pod**:
    ```bash
    kubectl get pods -n bookland
    ```
    *Yêu cầu*: Tất cả các Pod phải ở trạng thái `Running` và cột `READY` hiển thị đầy đủ (ví dụ: `1/1` hoặc `2/2`).
2.  **Xem log khởi động của ứng dụng**:
    ```bash
    kubectl logs -f deployment/book-service -n bookland
    ```
3.  **Kiểm tra trạng thái của HPA**:
    ```bash
    kubectl get hpa -n bookland
    ```
4.  **Kiểm tra dịch vụ lưu trữ**:
    ```bash
    kubectl get pvc -n bookland
    ```

---

## 5. Cẩm nang xử lý sự cố thường gặp (Troubleshooting Guide)

Khi triển khai trên K8s, một số lỗi phổ biến có thể xảy ra. Hãy bình tĩnh sử dụng sơ đồ chẩn đoán sau:

```
[ Pod gặp lỗi ] ──► Chạy lệnh: kubectl describe pod <tên-pod> -n bookland
                        │
                        ├─► Trạng thái: ImagePullBackOff / ErrImagePull
                        │     └─► Nguyên nhân: Nhập sai tên image hoặc chưa login docker registry.
                        │
                        ├─► Trạng thái: CrashLoopBackOff
                        │     └─► Nguyên nhân: App bị crash ngay khi khởi động.
                        │     └─► Khắc phục: Xem log bằng lệnh: kubectl logs <tên-pod> -n bookland
                        │
                        ├─► Trạng thái: OOMKilled
                        │     └─► Nguyên nhân: App tốn RAM vượt quá limits.memory khai báo.
                        │     └─► Khắc phục: Tăng limits.memory trong file YAML.
                        │
                        └─► Trạng thái: Pod ở PENDING lâu
                              └─► Nguyên nhân: Cluster hết tài nguyên CPU/RAM hoặc PVC không bind được.
```

### 5.1 Lỗi `CrashLoopBackOff` do không kết nối được Database
*   **Triệu chứng**: Pod Spring Boot khởi chạy nhưng liên tục tự restart, kiểm tra logs thấy thông báo `Connection Refused` đến cơ sở dữ liệu.
*   **Giải pháp**:
    *   Đảm bảo Pod Database đã ở trạng thái `Running` trước khi deploy app.
    *   Kiểm tra DNS DB trong ConfigMap có đúng định dạng: `<tên-service-db>:<port>` (ví dụ: `book-db:3306`).
    *   Đảm bảo mật khẩu nạp từ Secret khớp hoàn toàn giữa cấu hình Database và cấu hình App.

### 5.2 Lỗi Liveness/Readiness Probe liên tục Fail làm Pod tự Restart
*   **Triệu chứng**: Ứng dụng khởi động xong, chạy được khoảng 1-2 phút thì tự động bị K8s Kill và restart lại, log báo lỗi Health Check fail.
*   **Nguyên nhân**: Giá trị `initialDelaySeconds` quá nhỏ, K8s tiến hành check khi Spring Boot còn đang trong quá trình load các class và khởi tạo Kafka connections (mất khoảng 30-40s).
*   **Khắc phục**: Tăng `initialDelaySeconds` lên `60` hoặc `90` giây để cho app đủ thời gian khởi động hoàn chỉnh trước khi check sức khỏe.

---

*← [16 - Lý thuyết Kubernetes](./16-kubernetes-theory.md) | [← Quay lại Trang chủ README](./README.md)*
