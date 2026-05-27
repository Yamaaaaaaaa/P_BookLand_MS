# Hướng Dẫn Triển Khai BookLand Lên Minikube Trên Cloud Server

Tài liệu này hướng dẫn chi tiết từng bước thiết lập từ đầu (máy chủ trắng) để chạy toàn bộ hệ thống microservices **BookLand** trên **Minikube** (sử dụng Docker driver) trên một máy chủ Cloud chạy hệ điều hành **Ubuntu (20.04/22.04/24.04 LTS)**.

---

## 🖥️ 1. Yêu Cầu Cấu Hình Phần Cứng (Khuyến Nghị)

Hệ thống BookLand bao gồm rất nhiều dịch vụ nặng:
*   **Cơ sở hạ tầng**: MySQL, MongoDB, Elasticsearch, Kafka, MinIO, Redis.
*   **Dịch vụ nghiệp vụ**: 9 microservices Java (Spring Boot) + 1 React Frontend (Nginx).

> [!IMPORTANT]
> **Cấu hình tối thiểu**: **4 vCPUs và 8GB RAM**.
> **Cấu hình khuyến nghị**: **8 vCPUs và 16GB RAM** để hệ thống chạy mượt mà và không bị lỗi tràn bộ nhớ (Out-Of-Memory - OOM) khiến các Pod bị tự động tắt (Killed).

---

## 🛠️ 2. Bước 1: Cài Đặt Docker Engine (Driver Cho Minikube)

Vì máy chủ Cloud (ảo hóa) thường không hỗ trợ nested virtualization (ảo hóa lồng), việc sử dụng **Docker Driver** cho Minikube là phương án tối ưu và dễ cấu hình nhất.

Chạy các lệnh sau với quyền `sudo`:

```bash
# Cập nhật danh sách gói
sudo apt update && sudo apt upgrade -y

# Cài đặt các gói hỗ trợ tải qua HTTPS
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common gnupg lsb-release

# Thêm GPG key của Docker
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Thêm Docker repository vào APT sources
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Cài đặt Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io

# Khởi động Docker và kích hoạt chạy cùng hệ thống
sudo systemctl start docker
sudo systemctl enable docker
```

### Cấu hình quyền chạy Docker & Xử lý quyền root (Bắt buộc cho Minikube)

Minikube khuyến cáo **không chạy bằng quyền root/sudo**. 

#### Trường hợp A: Bạn đang đăng nhập bằng quyền root (`root@...`)
Hãy tạo một user mới (ví dụ đặt tên là `k8s-user`), cấp quyền `sudo`, thêm vào group `docker` và chuyển sang user đó:

```bash
# 1. Tạo user mới tên là k8s-user (hệ thống sẽ yêu cầu nhập mật khẩu cho user này)
adduser k8s-user

# 2. Cấp quyền sudo cho k8s-user
usermod -aG sudo k8s-user

# 3. Thêm k8s-user vào group docker
usermod -aG docker k8s-user

# 4. Chuyển sang user mới để thực hiện toàn bộ các bước tiếp theo
su - k8s-user
```

#### Trường hợp B: Bạn đã đăng nhập bằng user thường (như `ubuntu`, `debian`...)
Bạn chỉ cần thêm user hiện tại vào group `docker`:

```bash
# Thêm user hiện tại vào group docker
sudo usermod -aG docker $USER

# Áp dụng thay đổi quyền (hoặc log out và log in lại SSH)
newgrp docker
```

*Kiểm tra Docker hoạt động:* `docker ps` (lệnh này phải chạy thành công mà không cần `sudo`).

---

## 📦 3. Bước 2: Cài Đặt Kubectl & Minikube

### Cài đặt Kubectl (Kubernetes CLI)
```bash
# Tải kubectl bản mới nhất
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"

# Cài đặt kubectl
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Kiểm tra cài đặt
kubectl version --client
```

### Cài đặt Minikube
```bash
# Tải minikube deb package
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64

# Cài đặt minikube
sudo install minikube-linux-amd64 /usr/local/bin/minikube

# Kiểm tra cài đặt
minikube version
```

---

## 🚀 4. Bước 3: Khởi Chạy Minikube

Chúng ta sẽ khởi chạy Minikube bằng docker driver. Để có thể truy cập trực tiếp các dịch vụ Web (Frontend, API) từ IP Public của máy chủ Cloud, ta cần ánh xạ (forward) cổng `80` và `443` từ container Minikube ra ngoài máy chủ thật.

```bash
# Khởi chạy Minikube với cấu hình tài nguyên (điều chỉnh RAM/CPU dựa theo máy chủ của bạn)
# Ví dụ cấu hình cho máy chủ 8GB RAM (cấp 6GB cho Minikube) và mapping port 80/443:
minikube start --driver=docker \
  --memory=6144 \
  --cpus=4 \
  --ports=80:80,443:443
```
*(Nếu máy chủ của bạn có 16GB RAM, hãy cấp `--memory=12288` và `--cpus=6` để hệ thống hoạt động tối ưu).*

### Bật addon Ingress để định tuyến domain
```bash
minikube addons enable ingress
```

---

## 🏗️ 5. Bước 4: Chuẩn Bị & Biên Dịch Mã Nguồn

### Cài đặt JDK 17 & Maven trên máy chủ Cloud để build JAR:
```bash
sudo apt update
sudo apt install -y openjdk-17-jdk maven git
```

### Clone source code của dự án về máy chủ (Nhánh dev):
```bash
# Di chuyển tới thư mục home và clone code nhánh dev
cd ~
git clone -b dev https://github.com/Yamaaaaaaaa/P_BookLand_MS.git P_BookLand_MS
cd P_BookLand_MS
```

### Biên dịch tất cả các microservices thành file `.jar`:
```bash
mvn clean package -DskipTests
```
*Lưu ý: Quá trình build có thể mất từ 3-5 phút tùy thuộc vào hiệu năng CPU của máy chủ Cloud.*

---

## 🐳 6. Bước 5: Build Docker Images Vào Trong Minikube

Để Kubernetes chạy được các microservices tự build, chúng ta cần lưu các Docker images trực tiếp vào registry nội bộ của Minikube.

```bash
# Trỏ Docker CLI hiện tại của Terminal vào Docker Daemon bên trong Minikube
eval $(minikube docker-env)
```
*(Sau lệnh này, mọi lệnh `docker build` hoặc `docker images` bạn chạy sẽ thực thi trực tiếp trên Docker daemon của Minikube).*

### Tiến hành build toàn bộ microservices:
Chạy lần lượt các lệnh build sau (đảm bảo bạn đang đứng ở thư mục gốc `P_BookLand_MS`):

```bash
# Build Business Services
docker build -t bookland/api-gateway:1.0 -f services/api-gateway/Dockerfile .
docker build -t bookland/book-service:1.0 -f services/book-service/Dockerfile .
docker build -t bookland/chat-service:1.0 -f services/chat-service/Dockerfile .
docker build -t bookland/event-service:1.0 -f services/event-service/Dockerfile .
docker build -t bookland/file-service:1.0 -f services/file-service/Dockerfile .
docker build -t bookland/identity-service:1.0 -f services/identity-service/Dockerfile .
docker build -t bookland/notification-service:1.0 -f services/notification-service/Dockerfile .
docker build -t bookland/order-service:1.0 -f services/order-service/Dockerfile .
docker build -t bookland/search-service:1.0 -f services/search-service/Dockerfile .
docker build -t bookland/user-service:1.0 -f services/user-service/Dockerfile .
```

> [!TIP]
> Bạn có thể kiểm tra xem các ảnh đã lưu thành công chưa bằng lệnh:
> `docker images | grep bookland`

---

## ☸️ 7. Bước 6: Triển Khai Lên Kubernetes

### 1. Tạo namespace `bookland`
```bash
kubectl create namespace bookland
```

### 2. Tạo file `.env` trên VPS và nạp vào Kubernetes Secret

Để các Microservices kết nối được cơ sở dữ liệu và các dịch vụ bên thứ ba (như Supabase, VNPay, Mail Server...), chúng ta cần nạp các cấu hình từ file `.env` vào Kubernetes dưới dạng một **Secret** tên là `bookland-secret`.

#### Bước 2a: Tạo hoặc Copy file `.env` vào thư mục dự án trên VPS

Hãy chọn một trong hai cách dưới đây:

*   **Cách 1: Tạo trực tiếp bằng trình soạn thảo `nano` và dán nội dung (Khuyên dùng)**
    Chạy lệnh sau trên terminal của VPS:
    ```bash
    # Di chuyển vào thư mục dự án trên VPS
    cd ~/P_BookLand_MS
    
    # Mở trình soạn thảo nano để tạo file .env
    nano .env
    ```
    Bây giờ, hãy copy toàn bộ nội dung file `.env` từ máy tính cá nhân của bạn. Nhấp chuột phải (hoặc nhấn `Ctrl + Shift + V` / `Cmd + V`) vào cửa sổ Terminal của VPS để dán nội dung vào.
    
    Để lưu và thoát:
    1. Nhấn tổ hợp phím `Ctrl + O` sau đó ấn `Enter` để lưu file.
    2. Nhấn tổ hợp phím `Ctrl + X` để thoát khỏi trình soạn thảo.

*   **Cách 2: Copy file từ máy cá nhân lên VPS qua SCP**
    Mở một cửa sổ Terminal/CMD/PowerShell **trên máy tính cá nhân của bạn** (đứng ở thư mục chứa file `.env` hiện tại) và chạy lệnh:
    ```bash
    scp .env k8s-user@<IP_MÁY_CHỦ_CLOUD>:~/P_BookLand_MS/.env
    ```
    *(Thay `<IP_MÁY_CHỦ_CLOUD>` bằng IP VPS của bạn. Hệ thống sẽ hỏi mật khẩu của user `k8s-user` để bắt đầu truyền file).*

#### Bước 2b: Tạo Kubernetes Secret từ file `.env`
Đứng tại thư mục `~/P_BookLand_MS` trên VPS, chạy lệnh sau:

```bash
kubectl create secret generic bookland-secret --from-env-file=.env -n bookland
```

> [!NOTE]
> Để các microservices có thể sử dụng các biến cấu hình trong `bookland-secret`, các file Deployment YAML đã được thiết kế sẵn để đọc trực tiếp các biến môi trường này.

### 3. Triển khai hạ tầng (Databases, Kafka, MinIO, ES, Redis)
```bash
kubectl apply -f k8s/01-infrastructure/
```

### 4. Triển khai các Microservices
```bash
kubectl apply -f k8s/02-services/
```

### 5. Triển khai Ingress
```bash
kubectl apply -f k8s/03-ingress/
```

### 🔍 Kiểm tra trạng thái của các Service & Pod
```bash
# Xem danh sách Pods đang chạy
kubectl get pods -n bookland -w
```
> [!NOTE]
> Ban đầu các Pod có thể ở trạng thái `ContainerCreating` hoặc gặp lỗi `CrashLoopBackOff` tạm thời. Điều này là bình thường vì các microservices Java khởi chạy nhanh hơn các DB (MySQL, Kafka). Kubernetes sẽ tự động restart chúng và sau khoảng 2-3 phút, tất cả các Pod sẽ chuyển sang trạng thái `Running`.

---

## 🌐 8. Bước 7: Truy Cập API Từ Máy Cá Nhân (Local)

Để kết nối với các API Gateway chạy trên máy chủ Cloud thông qua tên miền cấu hình trong Ingress (`api.bookland.local`):

### Cấu hình file Hosts trên máy tính cá nhân của bạn (PC/Laptop):
1.  **Nếu dùng Windows**:
    *   Mở Notepad bằng quyền Administrator (Run as Administrator).
    *   Mở file: `C:\Windows\System32\drivers\etc\hosts`.
    *   Thêm dòng sau vào cuối file (thay `<IP_PUBLIC_MÁY_CHỦ_CLOUD>` bằng IP của VPS):
        ```text
        <IP_PUBLIC_MÁY_CHỦ_CLOUD> api.bookland.local
        ```
2.  **Nếu dùng macOS / Linux**:
    *   Mở Terminal và chạy: `sudo nano /etc/hosts`.
    *   Thêm dòng tương tự ở trên vào cuối file và lưu lại.

### Kiểm tra truy cập:
Sau khi cấu hình hosts, hãy mở trình duyệt trên máy cá nhân và truy cập:
*   **API Gateway (Swagger UI):** `http://api.bookland.local/webjars/swagger-ui/index.html` (hoặc test các endpoint của API).
