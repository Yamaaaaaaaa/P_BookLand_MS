# 13 — Hạ tầng & Hướng dẫn Triển khai trên K8s Minikube

> Tài liệu này là Chi tiết phần triển khai: 

## 1. Hướng dẫn Triển khai Từng bước (5 Giai đoạn Thực chiến)

### Giai đoạn 1: Chuẩn bị Môi trường & Tài nguyên (Ngày 1)

#### Bước 0: Cài đặt Minikube:
```bash
# 1. Tải file cài đặt Minikube
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64

# 2. Cấp quyền thực thi
chmod +x minikube-linux-amd64

# 3. Di chuyển vào thư mục /usr/local/bin (thư mục hệ thống)
sudo mv minikube-linux-amd64 /usr/local/bin/minikube
```

#### Bước 1: Khởi động Minikube với cấu hình cao

Mở terminal máy ảo Ubuntu của bạn và chạy các lệnh:
```bash
# 1. Xóa cluster cũ bị lỗi hoặc thừa để làm sạch tài nguyên ổ cứng
minikube delete

# 2. Khởi động cấu hình Minikube driver Docker tối ưu tiết kiệm tài nguyên
minikube start --driver=docker --cpus=3 --memory=6144 --disk-size=20g

# 3. Cài đặt công cụ điều khiển kubectl (Nếu máy ảo báo 'kubectl not found')
sudo snap install kubectl --classic
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

##### 1. MySQL (`k8s/01-infrastructure/mysql.yaml`)
##### 2. Apache Kafka ở chế độ KRaft (`k8s/01-infrastructure/kafka.yaml`)
##### 3. MongoDB cho Notification Service (`k8s/01-infrastructure/mongodb.yaml`)
##### 4. Elasticsearch cho Search Service (`k8s/01-infrastructure/elasticsearch.yaml`)
##### 5. MinIO cho File Service (`k8s/01-infrastructure/minio.yaml`)


#### Bước 2: Khởi chạy tầng hạ tầng vào K8s Cluster
Tiến hành áp dụng các cấu hình hạ tầng vào namespace `bookland`:
```bash
# 1. Đứng tại thư mục gốc của dự án trên máy ảo
cd /home/vboxuser/P_BookLand_MS

# 2. Đảm bảo bạn đã tạo namespace bookland
kubectl create namespace bookland --dry-run=client -o yaml | kubectl apply -f -

# 3. Áp dụng tất cả các file cấu hình database & broker từ thư mục k8s/01-infrastructure/
kubectl apply -f k8s/01-infrastructure/
```

**Xác minh trạng thái**: Đảm bảo tất cả PVC đều ở trạng thái `Bound` và toàn bộ các Pod Database/Broker phải báo trạng thái **`Running (1/1)`** trước khi chuyển sang bước tiếp theo:
```bash
kubectl get pvc,pods -n bookland
```

---

### Giai đoạn 3: Đồng bộ Git & Đóng gói Ứng dụng cục bộ (Dockerize) (Ngày 3)

Trong môi trường thực tế, bạn viết code trên máy thật **Windows Host**, sau đó cần đẩy (Push) lên Git và kéo (Pull) về **máy ảo Ubuntu** để tiến hành đóng gói Docker.

> [!TIP]
> **Điểm cải tiến cực lớn:** Hệ thống đã được nâng cấp lên **Dockerfile đa giai đoạn (Multi-stage Dockerfile)**. Toàn bộ tiến trình biên dịch code Java ra file JAR và đóng gói sẽ diễn ra **100% bên trong container Docker**. Bạn **không cần phải cài đặt JDK 17 hay Maven trên máy ảo Ubuntu** nữa! Điều này giúp tiết kiệm tài nguyên máy ảo và tăng tốc độ triển khai vượt trội!

#### Bước 1: Cài đặt và cấu hình Git trên máy ảo Ubuntu (Nếu chưa có)

Nếu máy ảo Ubuntu của bạn chưa được cài đặt Git, hãy mở Terminal máy ảo và chạy:
```bash
# 1. Cập nhật và cài đặt Git
sudo apt update
sudo apt install git -y

# 2. Cấu hình định danh Git cục bộ
git config --global user.name "Your Name"
git config --global user.email "your-email@example.com"
```

#### Bước 2: Đồng bộ hóa mã nguồn thông qua Git

1. **Tại máy thật Windows Host (nơi viết code)**:
   Mở Git Bash hoặc Terminal trên Windows tại thư mục gốc dự án và đẩy nhánh `dev` lên:
   ```bash
   git add .
   git commit -m "deploy: update kubernetes deployment configurations"
   git push origin dev
   ```
2. **Tại máy ảo Ubuntu (vboxuser)**:
   *   **Trường hợp chưa có thư mục code:** Bạn clone thẳng nhánh `dev` về thư mục home:
       ```bash
       cd /home/vboxuser
       git clone -b dev https://github.com/Yamaaaaaaaa/P_BookLand_MS.git
       ```
   *   **Trường hợp đã có thư mục code cũ:** Bạn pull nhánh `dev` về để ghi đè code mới nhất:
       ```bash
       cd /home/vboxuser/P_BookLand_MS
       git fetch
       git checkout -f dev
       git pull origin dev
       ```

#### Bước 3: Cài đặt JDK 17, Maven và Biên dịch mã nguồn ra file JAR

Vì cấu trúc hiện tại yêu cầu build ra file `.jar` trên máy ảo Ubuntu (host) trước khi đưa vào Docker, bạn cần cài đặt môi trường và biên dịch mã nguồn.

##### 3.1 Cài đặt JDK 17 và Maven trên máy ảo Ubuntu (Nếu chưa có)

Nếu máy ảo chưa được cài đặt Java và Maven, hãy mở Terminal trên Ubuntu và chạy các lệnh sau:

```bash
# 1. Cập nhật danh sách gói phần mềm
sudo apt update

# 2. Cài đặt OpenJDK 17 và Maven
sudo apt install openjdk-17-jdk maven -y

# 3. Xác minh cài đặt thành công
java -version
mvn -version
```

##### 3.2 Biên dịch mã nguồn

Tại thư mục gốc `/home/vboxuser/P_BookLand_MS`, chạy lệnh sau để build toàn bộ các service:
```bash
mvn clean package -DskipTests
```

#### Bước 4: Trỏ terminal máy ảo vào Docker Daemon của Minikube
Tại cửa sổ Terminal của máy ảo Ubuntu, chạy lệnh liên kết môi trường:
```bash
eval $(minikube -p minikube docker-env)
```
*(Từ lúc này, mọi lệnh `docker build` chạy trong terminal này sẽ ghi trực tiếp vào Registry của cụm Minikube).*

#### Bước 4: Đóng gói Docker Image trực tiếp từ mã nguồn (Containerized Build)
Đứng tại thư mục gốc dự án `/home/vboxuser/P_BookLand_MS` trong máy ảo, chạy lệnh build ảnh Docker cho từng service. Docker sẽ tự động biên dịch và đóng gói JAR ngay trong container:
```bash
# 1. Build API Gateway
docker build -t bookland/api-gateway:1.0 -f services/api-gateway/Dockerfile .

# 2. Build Identity Service
docker build -t bookland/identity-service:1.0 -f services/identity-service/Dockerfile .

# 3. Build User Service
docker build -t bookland/user-service:1.0 -f services/user-service/Dockerfile .

# 4. Build Book Service
docker build -t bookland/book-service:1.0 -f services/book-service/Dockerfile .

# 5. Build Order Service
docker build -t bookland/order-service:1.0 -f services/order-service/Dockerfile .

# 6. Build Event Service
docker build -t bookland/event-service:1.0 -f services/event-service/Dockerfile .

# 7. Build Notification Service
docker build -t bookland/notification-service:1.0 -f services/notification-service/Dockerfile .

# 8. Build Search Service
docker build -t bookland/search-service:1.0 -f services/search-service/Dockerfile .

# 9. Build File Service
docker build -t bookland/file-service:1.0 -f services/file-service/Dockerfile .
```
Kiểm tra danh sách ảnh K8s đã sẵn sàng trong cụm Minikube:
```bash
docker images | grep bookland
```

---

### Giai đoạn 4: Hướng dẫn Triển khai Từng bước lên Kubernetes (Minikube)

Sau khi đã lấy toàn bộ mã nguồn của nhánh `dev` từ Git về máy ảo Ubuntu, toàn bộ các tệp tin cấu hình tài nguyên Kubernetes (K8s Manifests) đã được xếp gọn gàng trong thư mục `/home/vboxuser/P_BookLand_MS/k8s`. 

Bạn chỉ cần thực hiện lần lượt các bước chuẩn hóa dưới đây để triển khai hệ thống:

#### 📂 Bước 1: Khởi tạo Namespace và Deploy tầng Hạ tầng (Database & Kafka)

Chúng ta tiến hành tạo phân vùng ảo biệt lập `bookland` và deploy các dịch vụ Stateful (MySQL, Kafka, MongoDB, Elasticsearch, MinIO) trước:

```bash
# 1. Di chuyển vào thư mục dự án trên máy ảo
cd /home/vboxuser/P_BookLand_MS

# 2. Tạo namespace 'bookland'
kubectl create namespace bookland --dry-run=client -o yaml | kubectl apply -f -

# 3. Triển khai toàn bộ cụm hạ tầng
kubectl apply -f k8s/01-infrastructure/
```

**🔍 Xác minh trạng thái:**
Bạn hãy gõ lệnh sau để giám sát trạng thái khởi động của các Pod hạ tầng. Hãy **chờ cho đến khi tất cả 5 pod (`mysql-0`, `kafka-0`, `mongodb-0`, `elasticsearch-0`, `minio-0`) đều báo trạng thái `Running (1/1)` hoàn toàn** (nhấn `Ctrl + C` để thoát):
```bash
kubectl get pods -n bookland -w
```

#### 🐳 Bước 2: Liên kết Docker máy ảo và Build các Docker Images cục bộ

Có 2 cách để build và nạp các ảnh Docker vào cụm Minikube (Khuyến khích sử dụng **Cách 2** nếu đường truyền mạng gặp lỗi `TLS handshake timeout` khi kết nối đến Docker Hub từ bên trong cụm):

##### Cách 1: Build trực tiếp vào Docker Daemon của Minikube (Mặc định)
```bash
# 1. Trỏ terminal vào Docker Daemon của Minikube
eval $(minikube -p minikube docker-env)

# 2. Đóng gói 9 microservices bằng Dockerfile đa giai đoạn
docker build -t bookland/api-gateway:1.0 -f services/api-gateway/Dockerfile .
docker build -t bookland/identity-service:1.0 -f services/identity-service/Dockerfile .
docker build -t bookland/user-service:1.0 -f services/user-service/Dockerfile .
docker build -t bookland/book-service:1.0 -f services/book-service/Dockerfile .
docker build -t bookland/order-service:1.0 -f services/order-service/Dockerfile .
docker build -t bookland/event-service:1.0 -f services/event-service/Dockerfile .
docker build -t bookland/notification-service:1.0 -f services/notification-service/Dockerfile .
docker build -t bookland/file-service:1.0 -f services/file-service/Dockerfile .
docker build -t bookland/search-service:1.0 -f services/search-service/Dockerfile .
```

##### Cách 2: Build bằng Docker của Ubuntu VM (Host) rồi nạp vào Minikube (Khuyên dùng khi lỗi mạng)
Nếu gặp lỗi timeout khi chạy Cách 1, hãy hủy liên kết Docker để quay về Docker Daemon của máy Ubuntu Host (có kết nối internet ổn định hơn). Sau đó build ảnh cục bộ rồi nạp trực tiếp vào cụm:
```bash
# 1. Hủy liên kết Docker Daemon của Minikube (quay về Docker của Ubuntu Host)
eval $(minikube -p minikube docker-env --unset)

# 2. Tiến hành build và nạp ảnh Docker vào cụm Minikube
docker build -t bookland/api-gateway:1.0 -f services/api-gateway/Dockerfile . && minikube image load bookland/api-gateway:1.0
docker build -t bookland/identity-service:1.0 -f services/identity-service/Dockerfile . && minikube image load bookland/identity-service:1.0
docker build -t bookland/user-service:1.0 -f services/user-service/Dockerfile . && minikube image load bookland/user-service:1.0
docker build -t bookland/book-service:1.0 -f services/book-service/Dockerfile . && minikube image load bookland/book-service:1.0
docker build -t bookland/order-service:1.0 -f services/order-service/Dockerfile . && minikube image load bookland/order-service:1.0
docker build -t bookland/event-service:1.0 -f services/event-service/Dockerfile . && minikube image load bookland/event-service:1.0
docker build -t bookland/notification-service:1.0 -f services/notification-service/Dockerfile . && minikube image load bookland/notification-service:1.0
docker build -t bookland/file-service:1.0 -f services/file-service/Dockerfile . && minikube image load bookland/file-service:1.0
docker build -t bookland/search-service:1.0 -f services/search-service/Dockerfile . && minikube image load bookland/search-service:1.0
```

#### 🚀 Bước 3: Triển khai các dịch vụ nghiệp vụ (Stateless Services)

Triển khai đồng loạt 9 dịch vụ nghiệp vụ (bao gồm cả API Gateway):

```bash
kubectl apply -f k8s/02-services/
```

**🔍 Xác minh trạng thái:**
Đảm bảo tất cả 9 dịch vụ đã báo trạng thái **`Running`**:
```bash
kubectl get pods -n bookland
```

#### 🌐 Bước 4: Triển khai cấu hình định tuyến Ingress

Cấu hình Ingress Controller để đón tiếp nhận tên miền `api.bookland.local` từ ngoài đi vào API Gateway bên trong cụm:

```bash
kubectl apply -f k8s/03-ingress/
```

#### 🧪 Bước 4.1: Hướng dẫn Truy cập thử nghiệm tức thì thông qua Localhost (Port-Forward)
> [!TIP]
> Nếu bạn muốn kiểm tra nhanh xem toàn bộ hệ thống microservices có hoạt động ổn định và liên kết với nhau thành công hay chưa ngay trên máy ảo Ubuntu **dưới dạng `localhost`** (mà không cần cấu hình file `hosts` tên miền hay chạy Tunnel ở các bước dưới), hãy sử dụng công cụ **`port-forward`** chuyên nghiệp của Kubernetes:

* **Bước 4.1.1: Chạy lệnh chuyển tiếp cổng (Port-Forward)**
  Mở Terminal trên máy ảo Ubuntu và chạy lệnh sau để ánh xạ cổng `8080` của API Gateway trong cụm K8s ra cổng `8080` của `localhost` máy ảo:
  ```bash
  kubectl port-forward service/api-gateway 8080:8080 -n bookland
  ```
  *(Lưu ý: Giữ nguyên cửa sổ Terminal này đang chạy để duy trì kết nối).*

* **Bước 4.1.2: Truy cập kiểm tra kết nối**
  Mở trình duyệt Firefox trên máy ảo Ubuntu (hoặc mở một tab terminal mới chạy `curl`) và truy cập đường dẫn thử nghiệm:
  ```text
  http://localhost:8080/api/users/hello
```
  Nếu nhận được chuỗi phản hồi **`Hello from User Service!`** thì chúc mừng bạn, toàn bộ hệ thống API Gateway và 9 microservices đã hoạt động liên kết với nhau hoàn hảo 100%!
```



#### Bước 5: Cấu hình Ingress & Thông mạng ngoài về Windows Host

Để máy thật Windows của bạn có thể gọi API trực tiếp vào Kubernetes Cluster trong máy ảo:

1. **Duy trì Network Tunnel trong máy ảo:**
   Mở một cửa sổ Terminal mới trong máy ảo Ubuntu (không được đóng) và chạy:
   ```bash
   minikube tunnel
   ```
2. **Lấy IP máy ảo Ubuntu:**
   Chạy lệnh `ip a` trên máy ảo Ubuntu để lấy IP card mạng LAN của máy ảo (ví dụ: card Host-only/Bridged, thường có dải mạng LAN dạng `192.168.1.50` hoặc `192.168.56.101`).

3. **💡 Hướng dẫn cấu hình IP TĨNH (Fix cứng IP) cho máy ảo Ubuntu để không bị đổi sau mỗi lần khởi động:**
   > [!TIP]
   > Để tránh việc card mạng (Bridged) bị cấp phát động DHCP đổi IP ngẫu nhiên sau mỗi lần khởi động lại máy ảo (làm bạn phải sửa lại file `hosts` trên Windows liên tục), hãy làm theo các bước chuẩn cấu hình **Netplan** dưới đây:
   
   * **Bước 3.1: Xác định tên card mạng cần cấu hình tĩnh**
     Chạy lệnh `ip a` trên máy ảo Ubuntu và quan sát các interface.
     * Vì bạn sử dụng **Bridged Mode** làm card mạng chính (vừa cấp mạng Internet và kết nối trực tiếp với máy Windows), card mạng này sẽ là **`enp0s3`** (hoặc tên tương tự hiển thị trong `ip a`).
   
   * **Bước 3.2: Cấu hình Netplan**
     Mở thư mục chứa file cấu hình mạng Netplan:
     ```bash
     cd /etc/netplan/
     ls
     ```
     *(Thường sẽ có một file tên là `01-netcfg.yaml`, `50-cloud-init.yaml` hoặc tương tự. Hãy mở file đó bằng quyền root, ví dụ: `sudo nano 50-cloud-init.yaml`)*.
     
     Tiến hành khai báo IP tĩnh cho card mạng Bridged **`enp0s3`** với IP tĩnh là **`192.168.2.110`** (như cấu hình bạn đã thiết lập):
     ```yaml
     network:
       version: 2
       renderer: networkd
       ethernets:
         enp0s3:
            dhcp4: false
            addresses:
              - 192.168.2.110/24 # IP tĩnh bạn muốn cố định cho máy ảo
            routes:
              - to: default
                via: 192.168.2.1 # Gateway của router nhà bạn
            nameservers:
              addresses: [8.8.8.8, 8.8.4.4] # Dùng 'addresses' (có chữ s) và DNS Google chuẩn
     ```
     *Lưu ý quan trọng: File YAML cực kỳ nhạy cảm với khoảng trắng thụt lề (indentation), hãy dùng 2 hoặc 4 dấu cách, không dùng phím Tab.*

   * **Bước 3.3: Áp dụng cấu hình Netplan mới**
     Lưu file (trong `nano` nhấn `Ctrl + O`, `Enter` rồi `Ctrl + X` để thoát), sau đó chạy lệnh áp dụng:
     ```bash
     sudo netplan apply
     ```
     Bây giờ, máy ảo Ubuntu của bạn đã được cố định IP tĩnh `192.168.2.110` vĩnh viễn và có mạng internet hoạt động hoàn hảo!

4. **Cấu hình file hosts trên máy thật Windows:**
   * Mở **Notepad** dưới quyền quản trị viên (**Run as Administrator**).
   * Mở tệp tin tại đường dẫn `C:\Windows\System32\drivers\etc\hosts`.
   * Thêm dòng sau vào cuối tệp tin và lưu lại:
     ```text
     192.168.2.110  api.bookland.local
     ```
     *(Hãy thay thế `192.168.2.110` bằng IP tĩnh thực tế của máy ảo Ubuntu bạn vừa fix cứng ở Bước 3).*
   * Giờ đây, bạn có thể truy cập các API Test như `http://api.bookland.local/auth/hello` trực tiếp từ Chrome hoặc Postman ở máy thật Windows cực kỳ ổn định mà không lo bị đổi IP!

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

---

## 4. Hướng dẫn Khởi động & Phục hồi hệ thống khi mở lại Máy ảo

Mỗi lần bạn tắt máy tính vật lý hoặc khởi động lại máy ảo Ubuntu, toàn bộ cụm Kubernetes Minikube và các kết nối chuyển tiếp (Port-Forward) sẽ bị tạm dừng. Hãy làm theo hướng dẫn dưới đây để kích hoạt lại toàn bộ hệ thống chỉ trong vài giây.

### 4.1 Quy trình thực hiện bằng các câu lệnh thủ công
Mở Terminal của máy ảo Ubuntu và chạy lần lượt các bước sau:

* **Bước 1: Khởi động lại cụm Minikube**
  ```bash
  minikube start
  ```
  *(Minikube sẽ tự động khôi phục dải mạng, gắn lại toàn bộ các ổ cứng PVC và kích hoạt lại toàn bộ 14/14 Pod hạ tầng & nghiệp vụ đã deploy từ trước).*

* **Bước 2: Xác minh toàn bộ các Pod đã chuyển sang trạng thái hoạt động**
  ```bash
  kubectl get pods -n bookland
  ```
  *(Đảm bảo tất cả các Pod đều báo trạng thái `Running` trước khi sang bước tiếp theo).*

* **Bước 3: Kích hoạt lại cổng chuyển tiếp để máy Windows truy cập**
  ```bash
  kubectl port-forward --address 0.0.0.0 service/api-gateway 8080:8080 -n bookland
  ```
  *(Giữ nguyên Terminal này đang chạy để duy trì đầu cầu kết nối).*

---

### 4.2 Tự động hóa 100% bằng Tập lệnh (Automation Script)
Để không cần phải nhớ và gõ lại các câu lệnh trên sau mỗi lần bật máy ảo, bạn có thể tạo một file Script tự động hóa như sau:

* **Bước 1: Tạo file script tự động hóa trên máy ảo**
  Đứng tại thư mục gốc của dự án `/home/vboxuser/P_BookLand_MS`, chạy lệnh:
  ```bash
  nano start-bookland.sh
  ```
* **Bước 2: Copy và dán nội dung dưới đây vào file:**
  ```bash
  #!/bin/bash
  echo "===================================================================="
  echo "🚀 ĐANG KHỞI ĐỘNG HỆ THỐNG BOOKLAND MICROSERVICES..."
  echo "===================================================================="

  # 1. Khởi động Minikube
  minikube start

  echo "⏳ Đang chờ các dịch vụ ổn định trong 10 giây..."
  sleep 10

  # 2. Hiển thị danh sách các Pod để kiểm tra trạng thái
  echo "🔍 DANH SÁCH CÁC POD HIỆN TẠI:"
  kubectl get pods -n bookland

  # 3. Kích hoạt Port-Forward ra mạng LAN
  echo "===================================================================="
  echo "🔌 ĐANG MỞ CỔNG CHUYỂN TIẾP (PORT-FORWARD: 8080) RA MẠNG NGOÀI..."
  echo "👉 Bạn có thể truy cập từ máy Windows: http://api.bookland.local:8080/api/users/hello"
  echo "⚠️  Lưu ý: Giữ nguyên Terminal này không được đóng để duy trì kết nối!"
  echo "===================================================================="
  
  kubectl port-forward --address 0.0.0.0 service/api-gateway 8080:8080 -n bookland
  ```
* **Bước 3: Cấp quyền thực thi cho file script**
  ```bash
  chmod +x start-bookland.sh
  ```

Từ nay về sau, sau mỗi lần khởi động lại máy ảo, bạn chỉ cần mở terminal lên và gõ duy nhất một dòng lệnh này là toàn bộ hệ thống tự động bật lên và kết nối thông suốt với Windows:
```bash
./start-bookland.sh
```
