# 13 — Hạ tầng & Hướng dẫn Triển khai trên K8s Minikube

> Tài liệu này là **hướng dẫn thực chiến tổng hợp toàn diện** về hạ tầng và các bước triển khai hệ thống **BookLand Microservice** lên cụm Kubernetes (K8s) Minikube (chạy bằng driver **Docker bên trong máy ảo VirtualBox**). Tài liệu được chuẩn hóa và thiết kế tối ưu hóa 100% tài nguyên dựa trên mô hình kiến trúc thực tế của bạn.

---

## 📌 Mục lục Liên kết nhanh
- [1. Sơ đồ Kiến trúc & Ánh xạ Tài nguyên (K8s Architecture Mapping)](#1-sơ-đồ-kiến-trúc--ánh-xạ-tài-nguyên-k8s-architecture-mapping)
  - [1.1 Sơ đồ Kiến trúc Tổng thể (Logical Architecture)](#11-sơ-đồ-kiến-trúc-tổng-thể-logical-architecture)
  - [1.2 Sơ đồ Dải mạng & Định tuyến Vật lý (Traffic Flow Architecture)](#12-sơ-đồ-dải-mạng--định-tuyến-vật-lý-traffic-flow-architecture)
  - [1.3 Bảng Ánh xạ Pod ➔ Container ➔ Service chi tiết](#13-bảng-ánh-xạ-pod--container--service-chi-tiết)
- [2. Hướng dẫn Triển khai Từng bước (5 Giai đoạn Thực chiến)](#2-hướng-dẫn-triển-khai-từng-bước-5-giai-đoạn-thực-chiến)
  - [Giai đoạn 1: Chuẩn bị Môi trường & Tài nguyên (Ngày 1)](#giai-đoạn-1-chuẩn-bị-môi-trường--tài-nguyên-ngày-1)
  - [Giai đoạn 2: Triển khai Tầng Hạ tầng & Dữ liệu Stateful (Ngày 2)](#giai-đoạn-2-triển-khai-tầng-hạ-tầng--dữ-liệu-stateful-ngày-2)
  - [Giai đoạn 3: Đóng gói Ứng dụng cục bộ (Dockerize) (Ngày 3)](#giai-đoạn-3-đóng-gói-ứng-dụng-cục-bộ-dockerize-ngày-3)
  - [Giai đoạn 4: Triển khai các Service nghiệp vụ lên Kubernetes (Ngày 4)](#giai-đoạn-4-triển-khai-các-service-nghiệp-vụ-lên-kubernetes-ngày-4)
  - [Giai đoạn 5: Cấu hình Ingress & Thông mạng ngoài (Ngày 5)](#giai-đoạn-5-cấu-hình-ingress--thông-mạng-ngoài-ngày-5)
- [3. Cẩm nang Lệnh Debug & Giám sát cụm (Troubleshooting CLI)](#3-cẩm-nang-lệnh-debug--giám-sát-cụm-troubleshooting-cli)

---

## 1. Sơ đồ Kiến trúc & Ánh xạ Tài nguyên (K8s Architecture Mapping)

Toàn bộ các tài nguyên của dự án **BookLand Microservice** được đặt chung trong một không gian ảo hóa biệt lập: `namespace: bookland`.

### 1.1 Sơ đồ Kiến trúc Tổng thể (Logical Architecture)

Dưới đây là sơ đồ chi tiết dòng chảy nghiệp vụ và mối liên kết dữ liệu giữa các thành phần.
*   **Đặc điểm cốt lõi**: Toàn bộ **5 Core Services** (Identity, User, Book, Order, Event) đều kết nối đọc ghi trực tiếp đến **một cụm MySQL duy nhất** thay vì chạy 5 MySQL rời rạc, giúp tiết kiệm tối đa tài nguyên bộ nhớ cho Minikube.
*   **Kafka KRaft Mode**: Apache Kafka chạy trực tiếp ở chế độ KRaft (không cần Zookeeper), tối giản hạ tầng và tăng tốc xử lý sự kiện.

```
                            ┌────────────────────────────────────┐
                            │            CLIENT LAYER            │
                            │  React Web App (Dev máy Windows)   │
                            │  React Native App (Expo máy thật)  │
                            └─────────────────┬──────────────────┘
                                              │ HTTPS / WSS
                                              ▼ api.bookland.local
                            ┌────────────────────────────────────┐
                            │     KUBERNETES INGRESS CONTROLLER  │
                            └─────────────────┬──────────────────┘
                                              │ (Chuyển tiếp cổng)
                                              ▼
                            ┌────────────────────────────────────┐
                            │             API GATEWAY            │
                            │       (Spring Cloud Gateway)       │
                            └──────┬───┬───┬───┬───┬─────────────┘
                                   │   │   │   │   │
                ┌──────────────────┘   │   │   │   └──────────────────┐
  Routing / JWT │                      │   │   │                      │ Routing / JWT
                ▼                      ▼   ▼   ▼                      ▼
        ┌──────────────┐ ┌───────────┐ ┌──────────┐ ┌───────────┐ ┌─────────────┐
        │   IDENTITY   │ │   USER    │ │   BOOK   │ │   ORDER   │ │    EVENT    │
        │   SERVICE    │ │  SERVICE  │ │ SERVICE  │ │  SERVICE  │ │   SERVICE   │
        │  Port: 8081  │ │Port: 8082 │ │Port: 8083│ │Port: 8084 │ │ Port: 8085  │
        └──────┬───────┘ └─────┬─────┘ └────┬─────┘ └─────┬─────┘ └──────┬──────┘
               │               │            │             │              │
               │               │  Read/Write│             │              │
               │               ▼            ▼             │              │
               │         ┌─────────────────────────┐      │              │
               │         │      MYSQL INSTANCE     │      │              │
               ├────────►│   (Single StatefulSet)  │◄─────┤              │
               │         │ Ports: 3306 (Shared DB) │      │              │
               │         └─────────────────────────┘      │              │
               │                                          │              │
               ▼                                          ▼              ▼
         ┌────────────────────────────────────────────────────────┐
         │              APACHE KAFKA MESSAGE BROKER               │◄─────[Publish Events]
         │              (KRaft Mode - No Zookeeper)               │
         └──────────────────────────┬─────────────────────────────┘
                                    │
                                    ├──────────────────────────┐
                           Consume  │                  Consume │
                                    ▼                          ▼
                       ┌────────────────────────┐  ┌────────────────────────┐
                       │  NOTIFICATION SERVICE  │  │     SEARCH SERVICE     │
                       │       Port: 8086       │  │       Port: 8088       │
                       └──────────┬─────────────┘  └───────────┬────────────┘
                                  │                            │
                                  ▼ Read/Write                 ▼ Index/Search
                       ┌────────────────────────┐  ┌────────────────────────┐
                       │        MONGODB         │  │     ELASTICSEARCH      │
                       │      Ports: 27017      │  │      Ports: 9200       │
                       └────────────────────────┘  └────────────────────────┘

    *Ghi chú: File Service (Port: 8087) là dịch vụ Stateless hoàn toàn, quản lý luồng upload ảnh/file tĩnh trực tiếp lên MinIO Object Storage (hoặc Supabase).*
```

---

### 1.2 Sơ đồ Dải mạng & Định tuyến Vật lý (Traffic Flow Architecture)

Cụm Minikube được cài đặt bằng Docker nằm bên trong máy ảo VirtualBox trên Windows Host của bạn. Do đó, traffic từ các Client bên ngoài Windows Host truy cập vào cụm phải vượt qua các dải mạng cô lập như sau:

```
[ TRÌNH DUYỆT WINDOWS HOST / MOBILE CLINET ]
  │
  ▼ Domain truy cập: http://api.bookland.local (File hosts trỏ về IP máy ảo: 192.168.1.50)
  │
┌─┼─────────────────────────────────────────────────────────────────────────┐
│ │ 🖥️ LỚP MÁY ẢO UBUNTU (VIRTUALBOX GUEST - Cổng 80/443)                    │
│ │                                                                         │
│ └──► [iptables NAT DNAT Rules]                                            │
│      Chuyển tiếp traffic từ cổng 80/443 của máy ảo ➔ IP Ingress nội bộ.    │
│      Lệnh: sudo iptables -t nat -A PREROUTING -p tcp --dport 80 ...       │
│                                                                           │
├─┼─────────────────────────────────────────────────────────────────────────┤
│ │ 🐳 LỚP MẠNG DOCKER NỘI BỘ (Dải IP Minikube: 192.168.49.0/24)            │
│ │                                                                         │
│ └──► IP Ingress Controller Pod ($INGRESS_IP, ví dụ: 192.168.49.2)         │
│        │                                                                  │
│        ▼ [Định tuyến Ingress bookland-ingress]                            │
│        │ Ánh xạ domain api.bookland.local ➔ Service api-gateway           │
│        │                                                                  │
│        └──► Service: api-gateway (Type: ClusterIP)                        │
│               │                                                           │
│               ▼                                                           │
│             [api-gateway Pod (Spring Cloud Gateway - Port 8080)]          │
│               │                                                           │
│               ├───► [identity-service Pod] ➔ kết nối ➔ MySQL Service      │
│               ├───► [user-service Pod]     ➔ kết nối ➔ MySQL Service      │
│               ├───► [book-service Pod]     ➔ kết nối ➔ MySQL Service      │
│               ├───► [order-service Pod]    ➔ kết nối ➔ MySQL Service      │
│               └───► [event-service Pod]    ➔ kết nối ➔ MySQL Service      │
└───────────────────────────────────────────────────────────────────────────┘
```

---

### 1.3 Bảng Ánh xạ Pod ➔ Container ➔ Service chi tiết

| Nhóm Layer | Tên Pod (K8s Pod Name) | Container trong Pod | Docker Image & Tag | Cổng mạng (Port) | K8s Service tương ứng | Loại Service (Type) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **API Gateway** | `api-gateway-*` | `api-gateway` | `bookland/api-gateway:1.0` | `8080` | `api-gateway` | `ClusterIP` |
| **Stateless Services** | `identity-service-*` | `identity-service` | `bookland/identity-service:1.0`| `8081` | `identity-service`| `ClusterIP` |
| | `user-service-*` | `user-service` | `bookland/user-service:1.0` | `8082` | `user-service` | `ClusterIP` |
| | `book-service-*` | `book-service` | `bookland/book-service:1.0` | `8083` | `book-service` | `ClusterIP` |
| | `order-service-*` | `order-service` | `bookland/order-service:1.0` | `8084` | `order-service` | `ClusterIP` |
| | `event-service-*` | `event-service` | `bookland/event-service:1.0` | `8085` | `event-service` | `ClusterIP` |
| | `notification-service-*`| `notification-service` | `bookland/notification-service:1.0`| `8086` | `notification-service`| `ClusterIP`|
| | `file-service-*` | `file-service` | `bookland/file-service:1.0` | `8087` | `file-service` | `ClusterIP` |
| | `search-service-*` | `search-service` | `bookland/search-service:1.0` | `8088` | `search-service` | `ClusterIP` |
| **Stateful Data Layer** | `mysql-0` | `mysql` | `mysql:8.0` | `3306` | `mysql` | `ClusterIP` |
| | `kafka-0` | `kafka` | `apache/kafka:3.7.0` (KRaft)| `9092` | `kafka` | `ClusterIP` |
| | `mongodb-0` | `mongodb` | `mongo:7.0` | `27017`| `mongodb` | `ClusterIP` |
| | `elasticsearch-0` | `elasticsearch` | `elasticsearch:8.11.0` | `9200` | `elasticsearch` | `ClusterIP` |
| | `minio-0` | `minio` | `minio/minio:latest` | `9000` | `minio` | `ClusterIP` |

---

## 2. Hướng dẫn Triển khai Từng bước (5 Giai đoạn Thực chiến)

### Giai đoạn 1: Chuẩn bị Môi trường & Tài nguyên (Ngày 1)

Hệ thống của bạn có tới 8 microservices và 5 cụm Database/Broker chạy đồng thời. Do đó, việc cấp phát đủ cấu hình tài nguyên cho cụm K8s Minikube là điều kiện bắt buộc.

#### Bước 1: Khởi động Minikube với cấu hình cao
> [!WARNING]
> Hãy đảm bảo rằng bạn thoát hoàn toàn quyền root (nếu có), đứng ở user thường (ví dụ: `vboxuser`) trên máy ảo Ubuntu để vận hành Docker và Minikube. Máy tính vật lý của bạn cần trống tối thiểu **12GB RAM**.

Mở terminal máy ảo Ubuntu của bạn và chạy các lệnh:
```bash
# 1. Xóa cluster cũ bị lỗi hoặc thừa để làm sạch tài nguyên ổ cứng
minikube delete

# 2. Khởi động cấu hình Minikube driver Docker tối ưu
minikube start --driver=docker --cpus=4 --memory=8192 --disk-size=30g
```

#### Bước 2: Kích hoạt Addon Ingress
Chúng ta bật Nginx Ingress Controller để làm cổng đón traffic tên miền `api.bookland.local` từ Windows Host:
```bash
minikube addons enable ingress
```
Kiểm tra xem các Pod của Ingress Controller đã khởi động thành công và báo trạng thái **`Running`**:
```bash
kubectl get pods -n ingress-nginx
```
*(Hãy chờ đợi cho tới khi cột STATUS hiển thị là `Running` trước khi sang bước tiếp theo).*

---

### Giai đoạn 2: Triển khai Tầng Hạ tầng & Dữ liệu Stateful (Ngày 2)

Chúng ta cần triển khai tầng Stateful (Cơ sở dữ liệu & Message Broker) trước để tạo sẵn các cổng kết nối và lưu trữ. Tất cả các file Manifest dưới đây sẽ bao gồm **PersistentVolumeClaim (PVC)**, **StatefulSet**, và **Service**.

#### Bước 1: Tạo các tệp Manifest cấu hình cho từng hạ tầng

##### 1. MySQL (`mysql-deployment.yaml`)
> [!IMPORTANT]
> Cấu hình duy nhất 1 Instance MySQL duy nhất chạy 5 Database con (`bookland_id`, `bookland_user`, `bookland_book`, `bookland_order`, `bookland_event`).
```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mysql-data
  namespace: bookland
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 5Gi
---
apiVersion: v1
kind: Service
metadata:
  name: mysql
  namespace: bookland
spec:
  ports:
    - port: 3306
  selector:
    app: mysql
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mysql
  namespace: bookland
spec:
  serviceName: "mysql"
  replicas: 1
  selector:
    matchLabels:
      app: mysql
  template:
    metadata:
      labels:
        app: mysql
    spec:
      containers:
        - name: mysql
          image: mysql:8.0
          env:
            - name: MYSQL_ROOT_PASSWORD
              value: "root"
          ports:
            - containerPort: 3306
              name: mysql
          volumeMounts:
            - name: mysql-persistent-storage
              mountPath: /var/lib/mysql
      volumes:
        - name: mysql-persistent-storage
          persistentVolumeClaim:
            claimName: mysql-data
```

##### 2. Apache Kafka ở chế độ KRaft (`kafka-deployment.yaml`)
> [!TIP]
> Sử dụng phiên bản KRaft (Kafka Raft Metadata mode) loại bỏ hoàn toàn sự phụ thuộc vào Zookeeper, giúp cụm cực kỳ nhẹ, tối ưu RAM và CPU cho máy ảo.
```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: kafka-data
  namespace: bookland
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 3Gi
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
kind: StatefulSet
metadata:
  name: kafka
  namespace: bookland
spec:
  serviceName: "kafka"
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
          image: apache/kafka:3.7.0
          env:
            - name: KAFKA_NODE_ID
              value: "1"
            - name: KAFKA_PROCESS_ROLES
              value: "broker,controller"
            - name: KAFKA_CONTROLLER_QUORUM_VOTERS
              value: "1@localhost:9093"
            - name: KAFKA_LISTENERS
              value: "PLAINTEXT://:9092,CONTROLLER://:9093"
            - name: KAFKA_ADVERTISED_LISTENERS
              value: "PLAINTEXT://kafka:9092"
            - name: KAFKA_CONTROLLER_LISTENER_NAMES
              value: "CONTROLLER"
            - name: KAFKA_LISTENER_SECURITY_PROTOCOL_MAP
              value: "PLAINTEXT:PLAINTEXT,CONTROLLER:PLAINTEXT"
            - name: KAFKA_LOG_DIRS
              value: "/var/lib/kafka/data"
          ports:
            - containerPort: 9092
              name: kafka
          volumeMounts:
            - name: kafka-persistent-storage
              mountPath: /var/lib/kafka/data
      volumes:
        - name: kafka-persistent-storage
          persistentVolumeClaim:
            claimName: kafka-data
```

##### 3. MongoDB cho Notification Service (`mongodb-deployment.yaml`)
```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mongo-data
  namespace: bookland
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 3Gi
---
apiVersion: v1
kind: Service
metadata:
  name: mongodb
  namespace: bookland
spec:
  ports:
    - port: 27017
  selector:
    app: mongodb
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mongodb
  namespace: bookland
spec:
  serviceName: "mongodb"
  replicas: 1
  selector:
    matchLabels:
      app: mongodb
  template:
    metadata:
      labels:
        app: mongodb
    spec:
      containers:
        - name: mongodb
          image: mongo:7.0
          env:
            - name: MONGO_INITDB_ROOT_USERNAME
              value: "root"
            - name: MONGO_INITDB_ROOT_PASSWORD
              value: "root"
          ports:
            - containerPort: 27017
              name: mongodb
          volumeMounts:
            - name: mongo-persistent-storage
              mountPath: /data/db
      volumes:
        - name: mongo-persistent-storage
          persistentVolumeClaim:
            claimName: mongo-data
```

##### 4. Elasticsearch cho Search Service (`elasticsearch-deployment.yaml`)
```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: es-data
  namespace: bookland
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 5Gi
---
apiVersion: v1
kind: Service
metadata:
  name: elasticsearch
  namespace: bookland
spec:
  ports:
    - port: 9200
  selector:
    app: elasticsearch
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: elasticsearch
  namespace: bookland
spec:
  serviceName: "elasticsearch"
  replicas: 1
  selector:
    matchLabels:
      app: elasticsearch
  template:
    metadata:
      labels:
        app: elasticsearch
    spec:
      containers:
        - name: elasticsearch
          image: elasticsearch:8.11.0
          env:
            - name: discovery.type
              value: "single-node"
            - name: ES_JAVA_OPTS
              value: "-Xms512m -Xmx512m"
            - name: xpack.security.enabled
              value: "false"
          ports:
            - containerPort: 9200
              name: es-port
          volumeMounts:
            - name: es-persistent-storage
              mountPath: /usr/share/elasticsearch/data
      volumes:
        - name: es-persistent-storage
          persistentVolumeClaim:
            claimName: es-data
```

##### 5. MinIO cho File Service (`minio-deployment.yaml`)
```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: minio-data
  namespace: bookland
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 5Gi
---
apiVersion: v1
kind: Service
metadata:
  name: minio
  namespace: bookland
spec:
  ports:
    - port: 9000
      name: api
    - port: 9001
      name: console
  selector:
    app: minio
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: minio
  namespace: bookland
spec:
  serviceName: "minio"
  replicas: 1
  selector:
    matchLabels:
      app: minio
  template:
    metadata:
      labels:
        app: minio
    spec:
      containers:
        - name: minio
          image: minio/minio:latest
          command:
            - server
            - /data
            - --console-address
            - ":9001"
          env:
            - name: MINIO_ROOT_USER
              value: "bookland"
            - name: MINIO_ROOT_PASSWORD
              value: "bookland123"
          ports:
            - containerPort: 9000
              name: minio-api
            - containerPort: 9001
              name: minio-console
          volumeMounts:
            - name: minio-persistent-storage
              mountPath: /data
      volumes:
        - name: minio-persistent-storage
          persistentVolumeClaim:
            claimName: minio-data
```

#### Bước 2: Khởi chạy tầng hạ tầng vào K8s Cluster
Tiến hành áp dụng các cấu hình hạ tầng vào namespace `bookland`:
```bash
# Đảm bảo bạn đã tạo namespace bookland
kubectl create namespace bookland --dry-run=client -o yaml | kubectl apply -f -

# Áp dụng tất cả các file cấu hình database & broker
kubectl apply -f mysql-deployment.yaml
kubectl apply -f kafka-deployment.yaml
kubectl apply -f mongodb-deployment.yaml
kubectl apply -f elasticsearch-deployment.yaml
kubectl apply -f minio-deployment.yaml
```

**Xác minh trạng thái**: Đảm bảo tất cả PVC đều ở trạng thái `Bound` và toàn bộ các Pod Database/Broker phải báo trạng thái **`Running (1/1)`** trước khi chuyển sang bước tiếp theo:
```bash
kubectl get pvc,pods -n bookland
```

---

### Giai đoạn 3: Đồng bộ Git & Đóng gói Ứng dụng cục bộ (Dockerize) (Ngày 3)

Trong môi trường thực tế, bạn viết code trên máy thật **Windows Host**, sau đó cần đẩy (Push) lên Git và kéo (Pull) về **máy ảo Ubuntu** để tiến hành biên dịch và đóng gói Docker. 

Bằng cách sử dụng tính năng chia sẻ trực tiếp Docker Daemon của Minikube với máy ảo, ta có thể build trực tiếp các project Spring Boot thành Docker Image nội bộ cực nhanh mà không cần đẩy lên Docker Hub.

#### Bước 1: Đồng bộ hóa mã nguồn thông qua Git

1. **Tại máy thật Windows Host (nơi viết code)**:
   Mở Git Bash hoặc Terminal trên Windows tại thư mục gốc dự án và chạy:
   ```bash
   git add .
   git commit -m "deploy: update kubernetes deployment configurations"
   git push origin main
   ```
2. **Tại máy ảo Ubuntu (vboxuser)**:
   Mở terminal máy ảo, di chuyển vào thư mục dự án và tiến hành pull code mới nhất về:
   ```bash
   cd /home/vboxuser/P_BookLand_MS
   git pull origin main
   ```

#### Bước 2: Biên dịch các dự án Spring Boot thành file JAR (Trong máy ảo)
Trước khi đóng gói Docker, ta cần biên dịch mã nguồn Java thành các file thực thi `.jar`.
> [!NOTE]
> Đảm bảo máy ảo của bạn đã được cài đặt sẵn JDK 17 và Maven để chạy biên dịch. Nếu chưa cài, chạy lệnh nhanh:
> `sudo apt update && sudo apt install openjdk-17-jdk maven -y`

Thực hiện biên dịch toàn bộ hệ thống ngay tại thư mục gốc dự án trong máy ảo:
```bash
# Biên dịch và đóng gói file JAR (Bỏ qua chạy test để tiết kiệm thời gian)
mvn clean package -DskipTests
```
*Đảm bảo tất cả các service báo build `SUCCESS` và sinh ra tệp `target/*.jar` tương ứng.*

#### Bước 3: Trỏ terminal máy ảo vào Docker Daemon của Minikube
Tại cửa sổ Terminal của máy ảo Ubuntu, chạy lệnh liên kết môi trường:
```bash
eval $(minikube -p minikube docker-env)
```
*(Từ lúc này, mọi lệnh `docker build` chạy trong terminal này sẽ ghi trực tiếp vào Registry của cụm Minikube).*

#### Bước 4: Đóng gói Docker Image cho từng Microservice từ file JAR
Chạy lệnh build ảnh Docker cho từng service từ file JAR đã biên dịch ở Bước 2:
```bash
# 1. Build API Gateway
docker build -t bookland/api-gateway:1.0 ./services/api-gateway

# 2. Build Identity Service
docker build -t bookland/identity-service:1.0 ./services/identity-service

# 3. Build User Service
docker build -t bookland/user-service:1.0 ./services/user-service

# 4. Build Book Service
docker build -t bookland/book-service:1.0 ./services/book-service

# 5. Build Order Service
docker build -t bookland/order-service:1.0 ./services/order-service

# 6. Build Event Service
docker build -t bookland/event-service:1.0 ./services/event-service

# 7. Build Notification Service
docker build -t bookland/notification-service:1.0 ./services/notification-service

# 8. Build Search Service
docker build -t bookland/search-service:1.0 ./services/search-service

# 9. Build File Service
docker build -t bookland/file-service:1.0 ./services/file-service
```
Kiểm tra danh sách ảnh K8s đã sẵn sàng trong cụm Minikube:
```bash
docker images | grep bookland
```

---

### Giai đoạn 4: Triển khai các Service nghiệp vụ lên Kubernetes (Ngày 4)

Chúng ta viết các file Manifest Deployments & Services (loại `ClusterIP`) cho các Service nghiệp vụ. Điểm mấu chốt là **tất cả 5 core services sẽ kết nối đến cùng 1 DNS `mysql`**.

#### Bước 1: Cấu hình trỏ DNS nội bộ của các microservice

Khi viết file YAML, bạn trỏ kết nối thông qua các tên miền DNS tự động được K8s cấp phát cho các hạ tầng đã tạo ở Giai đoạn 2:
*   **MySQL URL cho 5 core services**: `jdbc:mysql://mysql:3306/bookland_id` (hoặc `bookland_user`, `bookland_book`, `bookland_order`, `bookland_event` tương ứng).
*   **Kafka Bootstrap Servers**: `kafka:9092`
*   **MongoDB Uri**: `mongodb://root:root@mongodb:27017/notification_db?authSource=admin`
*   **Elasticsearch Uri**: `http://elasticsearch:9200`
*   **MinIO Uri**: `http://minio:9000`

##### Ví dụ mẫu cấu hình tệp tin `identity-service.yaml`:
```yaml
apiVersion: v1
kind: Service
metadata:
  name: identity-service
  namespace: bookland
spec:
  ports:
    - port: 8081
      targetPort: 8081
  selector:
    app: identity-service
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: identity-service
  namespace: bookland
spec:
  replicas: 1
  selector:
    matchLabels:
      app: identity-service
  template:
    metadata:
      labels:
        app: identity-service
    spec:
      containers:
        - name: identity-service
          image: bookland/identity-service:1.0
          imagePullPolicy: IfNotPresent  # Ép K8s sử dụng ảnh cục bộ vừa build ở Giai đoạn 3
          env:
            - name: SPRING_DATASOURCE_URL
              value: "jdbc:mysql://mysql:3306/bookland_id?createDatabaseIfNotExist=true"
            - name: SPRING_DATASOURCE_USERNAME
              value: "root"
            - name: SPRING_DATASOURCE_PASSWORD
              value: "root"
            - name: SPRING_KAFKA_BOOTSTRAP_SERVERS
              value: "kafka:9092"
          ports:
            - containerPort: 8081
```

#### Bước 2: Triển khai toàn bộ các Service nghiệp vụ lên cụm
Chạy các lệnh triển khai tuần tự:
```bash
kubectl apply -f identity-service.yaml
kubectl apply -f user-service.yaml
kubectl apply -f book-service.yaml
kubectl apply -f order-service.yaml
kubectl apply -f event-service.yaml
kubectl apply -f notification-service.yaml
kubectl apply -f search-service.yaml
kubectl apply -f file-service.yaml
```

#### Bước 3: Triển khai API Gateway
Triển khai file `api-gateway.yaml` đứng chặn trước để làm cổng kiểm soát duy nhất:
```bash
kubectl apply -f api-gateway.yaml
```
Kiểm tra xem tất cả các Pod nghiệp vụ đã báo **`Running (1/1)`**:
```bash
kubectl get pods -n bookland
```

---

### Giai đoạn 5: Cấu hình Ingress & Thông mạng ngoài (Ngày 5)

Mục đích là giúp các ứng dụng Client chạy ở máy chủ Windows thật kết nối mượt mà vào API Gateway chạy trong K8s bên trong máy ảo thông qua tên miền **`api.bookland.local`**.

#### Bước 1: Triển khai cấu hình định tuyến Ingress
Tạo file **`bookland-ingress.yaml`** để định tuyến mọi request gửi tới tên miền `api.bookland.local` đi thẳng vào dịch vụ `api-gateway`:
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: bookland-ingress
  namespace: bookland
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  rules:
    - host: api.bookland.local
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: api-gateway
                port:
                  number: 8080
```
Tiến hành áp dụng file cấu hình:
```bash
kubectl apply -f bookland-ingress.yaml
```

#### Bước 2: Duy trì Network Tunnel nội bộ trong máy ảo
Ingress Controller trong Minikube cần một tiến trình gán IP LoadBalancer. Hãy mở một tab Terminal SSH mới trên máy ảo Ubuntu (không đóng tab cũ) và chạy lệnh:
```bash
minikube tunnel
```
*Hãy luôn duy trì cửa sổ này chạy ngầm trong suốt quá trình phát triển dự án.*
Kiểm tra trạng thái IP của Ingress:
```bash
kubectl get ingress -n bookland
```
Bạn sẽ thấy cột `ADDRESS` hiển thị IP là `127.0.0.1`.

#### Bước 3: Cấu hình file hosts ở máy Windows thật để thông mạng biên
Để toàn bộ trình duyệt Web, phần mềm Postman, và ứng dụng Mobile Expo chạy ngoài máy thật Windows có thể giao tiếp với máy ảo:
1. Mở Terminal máy ảo Ubuntu, chạy lệnh `ip a` để lấy địa chỉ IP mạng nội bộ của VirtualBox (ví dụ: card `enp0s3` hoặc card Bridged Adapter, có dạng IP LAN như `192.168.1.50`).
2. Trên máy tính Windows thật của bạn, mở phần mềm **Notepad** dưới quyền quản trị viên (**Run as Administrator**).
3. Mở file tại đường dẫn: `C:\Windows\System32\drivers\etc\hosts`.
4. Thêm dòng cấu hình sau vào cuối file:
   ```text
   192.168.1.50  api.bookland.local
   ```
5. Lưu file lại. Giờ đây, khi bạn thực hiện gọi các API như `http://api.bookland.local/auth/login`, request sẽ được định tuyến thẳng qua IP máy ảo VirtualBox, đi qua quy tắc `iptables` vào cụm Minikube, được Ingress Controller phân phối thẳng vào API Gateway để xử lý.

---

## 3. Cẩm nang Lệnh Debug & Giám sát cụm (Troubleshooting CLI)

Khi làm việc thực tế với Kubernetes trên Minikube, bạn sẽ cần các lệnh chẩn đoán sự cố chuyên nghiệp sau để khắc phục lỗi nhanh:

### 3.1 Xem log trực tiếp của microservice nghiệp vụ
Nếu một container gặp lỗi logic hoặc không thể kết nối tới DB/Kafka khi khởi chạy:
```bash
# Xem log thời gian thực của microservice cụ thể
kubectl logs -f deployment/identity-service -n bookland --tail=100

# Xem log của một Pod cụ thể
kubectl logs -f <tên-pod-id-service> -n bookland
```

### 3.2 Chui trực tiếp vào bên trong container để debug mạng
Nếu bạn nghi ngờ kết nối giữa ứng dụng và MySQL hoặc Kafka bị lỗi, hãy chui trực tiếp vào trong terminal của Pod:
```bash
kubectl exec -it <tên-pod-book-service> -n bookland -- /bin/sh
```
Sau khi chui vào, chạy các lệnh kiểm tra cổng mạng:
```bash
# Kiểm tra xem có thông mạng tới MySQL không
nc -zv mysql 3306

# Kiểm tra xem có thông mạng tới Kafka không
nc -zv kafka 9092
```

### 3.3 Kiểm tra phân giải DNS nội bộ của Kubernetes Cluster
Bạn có thể khởi chạy một Pod kiểm tra mạng tạm thời để tra cứu DNS:
```bash
kubectl run dnsutils --image=tutum/dnsutils --rm -it -n bookland -- /bin/sh
```
Khi đã ở trong dấu nhắc lệnh của Pod kiểm thử, gõ:
```bash
nslookup mysql
nslookup kafka
```
Nếu K8s trả về đúng địa chỉ IP nội bộ của dịch vụ, tức là CoreDNS của cụm K8s đang hoạt động hoàn hảo!

### 3.4 Xem mô tả chi tiết sự kiện của K8s khi Pod bị lỗi
Nếu Pod ở trạng thái `CrashLoopBackOff`, `ImagePullBackOff` hoặc `Pending` lâu, hãy xem các mô tả sự kiện:
```bash
kubectl describe pod <tên-pod-lỗi> -n bookland
```
Hãy xem mục **Events** ở cuối cùng để thấy nguyên nhân cụ thể (ví dụ: Thiếu RAM trên node, lỗi bind PVC, tên Image viết sai...).
