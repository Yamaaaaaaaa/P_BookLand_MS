# 📘 Cẩm nang Thực chiến: YAML & Các Thành phần (Kind) trong Kubernetes

> Tài liệu này được biên soạn nhằm giải thích **chi tiết, trực quan và dễ hiểu nhất** về cú pháp YAML, cấu trúc thiết kế của các tài nguyên Kubernetes (K8s Manifest), và cách thức liên kết các thành phần hạ tầng (Pod, Deployment, Service, Ingress, PVC) trong hệ thống Microservices của bạn.

---

## 📌 Mục lục
- [1. YAML là gì? Quy tắc cú pháp cốt lõi](#1-yaml-là-gì-quy-tắc-cú-pháp-cốt-lõi)
- [2. Cấu trúc 4 Trụ cột của một File YAML Kubernetes](#2-cấu-trúc-4-trụ-cột-của-một-file-yaml-kubernetes)
- [3. Giải thích Chi tiết các Kinds (Tài nguyên K8s) thông dụng](#3-giải-thích-chi-tiết-các-kinds-tài-nguyên-k8s-thông-dụng)
  - [3.1 Pod - Nguyên tử nhỏ nhất](#31-pod---nguyên-tử-nhỏ-nhất)
  - [3.2 Deployment - Người quản lý Pod stateless](#32-deployment---người-quản-lý-pod-stateless)
  - [3.3 StatefulSet - Người bảo vệ dữ liệu có trạng thái](#33-statefulset---người-bảo-vệ-dữ-liệu-có-trạng-thái)
  - [3.4 Service - Cầu nối mạng ổn định](#34-service---cầu-nối-mạng-ổn-định)
  - [3.5 Ingress - Cổng đón traffic biên ngoài](#35-ingress---cổng-đón-traffic-biên-ngoài)
  - [3.6 PersistentVolumeClaim (PVC) - Yêu cầu cấp phát ổ cứng](#36-persistentvolumeclaim-pvc---yêu-cầu-cấp-phát-ổ-cứng)
- [4. Giải mã các Khái niệm Kỹ thuật cốt lõi (Metadata, Spec, Selectors, Replicas)](#4-giải-mã-các-khái-niệm-kỹ-thuật-cốt-lõi-metadata-spec-selectors-replicas)
- [5. Sơ đồ Liên kết & Dòng chảy Traffic giữa các Kind](#5-sơ-đồ-liên-kết--dòng-chảy-traffic-giữa-các-kind)
- [6. Các lỗi YAML thường gặp & Cách khắc phục nhanh](#6-các-lỗi-yaml-thường-gặp--cách-khắc-phục-nhanh)

---

## 1. YAML là gì? Quy tắc cú pháp cốt lõi

**YAML** (viết tắt của *YAML Ain't Markup Language*) là một ngôn ngữ định dạng dữ liệu thân thiện với con người, thường dùng để viết các cấu hình hệ thống. Trong Kubernetes, YAML là ngôn ngữ tiêu chuẩn để khai báo trạng thái mong muốn của hệ thống.

### ⚠️ 5 Nguyên tắc cú pháp "Bất di bất dịch" trong YAML:

1. **Sử dụng Dấu cách (Spaces), TUYỆT ĐỐI KHÔNG dùng Tab**:
   - YAML phân tách các khối lệnh dựa vào khoảng thụt lùi đầu dòng.
   - Thụt dòng sai 1 dấu cách sẽ dẫn tới lỗi cú pháp ngay lập tức.
   - *Khuyên dùng*: Sử dụng **2 dấu cách** cho mỗi cấp thụt lùi.
2. **Cặp Khóa - Giá trị (Key-Value)**:
   - Viết dưới dạng `key: value`.
   - **Bắt buộc** phải có **khoảng trắng** sau dấu hai chấm `:`.
   - *Đúng*: `name: identity-service` | *Sai*: `name:identity-service`
3. **Mảng / Danh sách (Arrays/Lists)**:
   - Các phần tử trong danh sách bắt đầu bằng dấu gạch ngang `-` kèm theo một khoảng trắng.
   - Ví dụ khai báo danh sách cổng:
     ```yaml
     ports:
       - containerPort: 8080
       - containerPort: 9000
     ```
4. **Phân tách các tài nguyên bằng dấu `---`**:
   - Bạn có thể khai báo nhiều tài nguyên (ví dụ: Service và Deployment) chung trong **một file YAML duy nhất** bằng cách dùng dòng `---` để ngăn cách giữa chúng.
5. **Chú thích (Comments)**:
   - Bắt đầu bằng dấu `#`. Trình biên dịch K8s sẽ bỏ qua các dòng này.

---

## 2. Cấu trúc 4 Trụ cột của một File YAML Kubernetes

Bất kỳ file YAML cấu hình tài nguyên nào trong Kubernetes cũng **bắt buộc** phải chứa 4 trường thông tin cấp cao (Top-level fields) sau đây:

```yaml
apiVersion: apps/v1     # 1. Phiên bản API sử dụng
kind: Deployment        # 2. Loại tài nguyên (Kind) cần tạo
metadata:               # 3. Thông tin định danh tài nguyên (Tên, Label, Namespace, ...)
  name: user-service
  namespace: bookland
spec:                   # 4. Định nghĩa chi tiết cấu hình mong muốn (Số Pod, Image, Port, ...)
  replicas: 3
  ...
```

### Chi tiết ý nghĩa 4 trụ cột:

| Trường (Field) | Loại dữ liệu | Ý nghĩa & Mô tả | Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| **`apiVersion`** | String | Phiên bản của API K8s mà bạn muốn dùng để tạo đối tượng này. Mỗi loại tài nguyên thuộc các nhóm API khác nhau. | `v1` (cho Pod, Service, PVC), `apps/v1` (cho Deployment, StatefulSet), `networking.k8s.io/v1` (cho Ingress). |
| **`kind`** | String | Phân loại của đối tượng bạn muốn tạo ra trong cụm K8s. | `Pod`, `Deployment`, `Service`, `Ingress`, `StatefulSet`. |
| **`metadata`** | Object | Chứa các dữ liệu giúp **định danh** đối tượng này. K8s dựa vào đây để phân loại và quản lý. | Bao gồm: `name` (tên đối tượng), `namespace` (không gian ảo chứa đối tượng), `labels` (nhãn dán lọc), `annotations` (ghi chú bổ sung). |
| **`spec`** | Object | Viết tắt của **Specification** (Đặc tả). Đây là phần quan trọng nhất, nơi bạn định nghĩa **trạng thái mong muốn** của đối tượng (Muốn chạy image gì? Bao nhiêu instance? Cấp bao nhiêu RAM/CPU?). | Khai báo `containers`, `replicas`, `selector`, `ports`, `volumes`,... |

---

## 3. Giải thích Chi tiết các Kinds (Tài nguyên K8s) thông dụng

### 3.1 Pod - Nguyên tử nhỏ nhất
**Pod** là đơn vị nhỏ nhất, cơ bản nhất mà bạn có thể tạo và quản lý trong Kubernetes. Một Pod đại diện cho một tiến trình đang chạy trong cụm của bạn. Một Pod có thể chứa một hoặc nhiều Container (nhưng thường là 1 container chính chạy ứng dụng của bạn).

> [!WARNING]
> Trong thực tế, bạn **hiếm khi tạo Pod trực tiếp** bằng `kind: Pod`. Lý do là vì nếu Pod bị chết (lỗi ứng dụng, hết RAM node...), K8s sẽ không tự phục sinh nó. Ta luôn dùng **Deployment** hoặc **StatefulSet** để sinh và giám sát Pod tự động.

#### 📝 Ví dụ Manifest tạo 1 Pod độc lập:
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: test-pod
  namespace: bookland
  labels:
    app: test-app
spec:
  containers:
    - name: application-container
      image: nginx:alpine
      ports:
        - containerPort: 80
```

---

### 3.2 Deployment - Người quản lý Pod stateless
**Deployment** là Kind phổ biến nhất, chuyên dùng để quản lý các ứng dụng **không có trạng thái (Stateless)** như các dịch vụ Web API Spring Boot của bạn (API Gateway, Identity, Book, User...).

#### Vai trò của Deployment:
- **Tự khắc phục lỗi (Self-healing)**: Nếu một Pod bị sập đột ngột, Deployment phát hiện ra và ngay lập tức khởi tạo Pod mới thay thế.
- **Tự động mở rộng (Scaling)**: Muốn chạy 5 Pod giống nhau cùng chia sẻ tải? Chỉ cần sửa số `replicas` thành `5`.
- **Cập nhật không gián đoạn (Rolling Update)**: Khi bạn phát hành phiên bản `2.0`, Deployment sẽ tạo Pod mới chạy v2 trước rồi mới xóa Pod cũ chạy v1, giúp người dùng không bao giờ gặp lỗi ngắt quãng dịch vụ.

```
                  ┌──────────────────────┐
                  │      Deployment      │
                  └──────────┬───────────┘
                             │ Quản lý & Giám sát
          ┌──────────────────┼──────────────────┐
          ▼                  ▼                  ▼
   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
   │ Pod-1 (1.0) │    │ Pod-2 (1.0) │    │ Pod-3 (1.0) │
   └─────────────┘    └─────────────┘    └─────────────┘
```

#### 📝 Ví dụ Manifest thực tế của `identity-service`:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: identity-service
  namespace: bookland
spec:
  replicas: 2           # Yêu cầu luôn duy trì đúng 2 Pod chạy song song
  selector:
    matchLabels:
      app: identity-service # Selector tìm và quản lý các Pod có nhãn tương ứng
  template:             # Template (Khuôn mẫu) dùng để sinh ra các Pod con
    metadata:
      labels:
        app: identity-service # Nhãn dán trên Pod con (BẮT BUỘC khớp với matchLabels ở trên)
    spec:
      containers:
        - name: identity-container
          image: bookland/identity-service:1.0
          imagePullPolicy: IfNotPresent # Dùng ảnh docker cục bộ trong Minikube
          ports:
            - containerPort: 8081
          env:
            - name: SPRING_DATASOURCE_URL
              value: "jdbc:mysql://mysql:3306/bookland_id"
```

---

### 3.3 StatefulSet - Người bảo vệ dữ liệu có trạng thái
**StatefulSet** cũng quản lý Pod giống như Deployment nhưng chuyên dùng cho các dịch vụ **có trạng thái (Stateful)**, cần lưu giữ thông tin lâu dài như Database hoặc Message Broker (MySQL, MongoDB, Kafka, Elasticsearch).

#### Khác biệt cốt lõi giữa StatefulSet và Deployment:

| Tính chất | Deployment (Stateless) | StatefulSet (Stateful) |
| :--- | :--- | :--- |
| **Tên Pod sinh ra** | Ngẫu nhiên ngắt quãng (Ví dụ: `identity-service-7f89d4b6-abcde`) | Có thứ tự và ổn định lâu dài (Ví dụ: `mysql-0`, `mongodb-0`). |
| **Địa chỉ DNS nội bộ** | Thay đổi liên tục khi Pod khởi động lại. | Cố định hoàn toàn (Pod `mysql-0` chết đi sống lại vẫn dùng đúng tên miền `mysql-0.mysql` để kết nối). |
| **Gắn kết ổ cứng (PVC)** | Tất cả Pod dùng chung 1 ổ cứng (không thích hợp cho database ghi song song). | Mỗi Pod được cấp phát **riêng biệt 1 ổ cứng vật lý độc lập** tương ứng với số thứ tự của nó. |

#### 📝 Ví dụ Manifest cho cụm `mysql`:
```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mysql
  namespace: bookland
spec:
  serviceName: "mysql"   # Liên kết với Headless Service để gán DNS ổn định
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
          volumeMounts:
            - name: mysql-persistent-storage
              mountPath: /var/lib/mysql # Nơi lưu trữ dữ liệu MySQL bên trong container
      volumes:
        - name: mysql-persistent-storage
          persistentVolumeClaim:
            claimName: mysql-data # Trỏ tới ổ cứng PVC định nghĩa ở dưới
```

---

### 3.4 Service - Cầu nối mạng ổn định
Vì các Pod con sinh ra trong Deployment có thể bị sập và khởi động lại với các địa chỉ IP nội bộ thay đổi liên tục, các microservice không thể gọi trực tiếp IP của nhau. **Service** sinh ra để giải quyết vấn đề này.

Service cung cấp một **IP tĩnh duy nhất** và một **tên miền DNS cố định** nội bộ (ví dụ: `http://identity-service:8081`). Khi một client gọi vào Service, Service sẽ chịu trách nhiệm tự động cân bằng tải (Load Balancing) và chuyển tiếp request tới một trong các Pod con đang chạy tốt ở phía sau.

```
                     [ Client Gọi Vào: http://identity-service:8081 ]
                                      │
                                      ▼
                        ┌───────────────────────────┐
                        │ Service: identity-service │ (IP cố định: 10.96.0.45)
                        └─────────────┬─────────────┘
                                      │ Cân bằng tải (Round-robin)
                       ┌──────────────┴──────────────┐
                       ▼                             ▼
              ┌─────────────────┐           ┌─────────────────┐
              │ Pod 1 (Running) │           │ Pod 2 (Running) │
              │ IP: 192.168.1.5 │           │ IP: 192.168.1.6 │
              └─────────────────┘           └─────────────────┘
```

#### Các loại Service thông dụng (`type`):
1. **`ClusterIP` (Mặc định)**: Cấp IP tĩnh ổn định nhưng **chỉ cho phép các dịch vụ gọi nhau nội bộ trong cụm K8s**. Bên ngoài trình duyệt không thể gọi vào.
2. **`NodePort`**: Mở một cổng cổng cao (từ `30000-32767`) trực tiếp trên tất cả các Node vật lý của bạn để bên ngoài có thể truy cập qua `http://<IP-May-Ao>:<NodePort>`.
3. **`LoadBalancer`**: Thường dùng trên Cloud (AWS, Azure, GCP) để tạo cổng Load Balancer có IP Public thực tế. Trên Minikube local, ta dùng lệnh `minikube tunnel` để giả lập IP này.

#### 📝 Ví dụ Manifest cho Service `identity-service` (Loại `ClusterIP` nội bộ):
```yaml
apiVersion: v1
kind: Service
metadata:
  name: identity-service
  namespace: bookland
spec:
  type: ClusterIP            # Loại dịch vụ mạng nội bộ
  ports:
    - port: 8081             # Cổng dịch vụ lắng nghe bên ngoài gọi vào (Service Port)
      targetPort: 8081       # Cổng thực tế ứng dụng Spring Boot chạy trong Container (Container Port)
  selector:
    app: identity-service    # Bộ lọc tìm tất cả các Pod có nhãn 'app: identity-service' để gom nhóm
```

---

### 3.5 Ingress - Cổng đón traffic biên ngoài
Nếu Service `ClusterIP` chỉ cho phép truy cập nội bộ, làm sao để trình duyệt chạy trên máy thật Windows của bạn có thể truy cập hệ thống? Câu trả lời là **Ingress**.

**Ingress** hoạt động như một máy chủ Reverse Proxy (giống như Nginx hoặc Apache). Nó là điểm đầu tiên đón nhận tất cả các request HTTP/HTTPS từ thế giới bên ngoài (máy Windows, điện thoại) đổ vào cụm, phân tích tên miền truy cập (`Host`) và đường dẫn đường dẫn (`Path`), sau đó điều hướng chính xác về Service tương ứng.

#### 📝 Ví dụ Manifest cấu hình Ingress chuyển tiếp tên miền `api.bookland.local`:
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: bookland-ingress
  namespace: bookland
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: / # Quy tắc viết lại URL nếu cần
spec:
  ingressClassName: nginx # Chỉ định sử dụng Nginx Ingress Controller cài sẵn của Minikube
  rules:
    - host: api.bookland.local # Phân tích request gửi tới domain này
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: api-gateway # Chuyển tiếp thẳng tới Service api-gateway
                port:
                  number: 8080    # Cổng Service api-gateway
```

---

### 3.6 PersistentVolumeClaim (PVC) - Yêu cầu cấp phát ổ cứng
Bản chất của các container là **vô thường** (Ephemeral): Khi Pod bị xóa đi hoặc khởi động lại, mọi file dữ liệu phát sinh (ví dụ: các dòng log, bản ghi MySQL) bên trong ổ cứng tạm của container sẽ **biến mất hoàn toàn**.

Để giữ lại dữ liệu vĩnh viễn, ta phải sử dụng cơ chế lưu trữ ngoài. Trong đó:
- **PersistentVolume (PV)**: Là ổ đĩa vật lý thực tế được admin tạo sẵn trên máy chủ.
- **PersistentVolumeClaim (PVC)**: Là "tờ đơn yêu cầu" do lập trình viên viết để đòi cấp phát ổ cứng với dung lượng và quyền đọc ghi nhất định từ cụm.

Khi PVC được tạo ra và tìm thấy PV trống phù hợp, chúng sẽ tự động **ràng buộc (Bound)** với nhau. Pod của bạn chỉ việc "gắn" (Mount) chiếc PVC này vào một thư mục bên trong container để đọc/ghi dữ liệu bền vững.

#### 📝 Ví dụ Manifest yêu cầu cấp 5 Gigabyte dữ liệu lưu trữ MySQL:
```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mysql-data
  namespace: bookland
spec:
  accessModes:
    - ReadWriteOnce # Chế độ đọc ghi: Chỉ cho phép 1 Node K8s gắn ổ cứng này vào tại một thời điểm
  resources:
    requests:
      storage: 5Gi  # Yêu cầu dung lượng ổ đĩa tối thiểu 5 Gigabyte
```

---

## 4. Giải mã các Khái niệm Kỹ thuật cốt lõi (Metadata, Spec, Selectors, Replicas)

Để liên kết các Kind ở trên hoạt động một cách thống nhất, Kubernetes sử dụng cơ chế kết nối cực kỳ linh hoạt thông qua các khái niệm nhãn và lọc.

### 4.1 Labels (Nhãn) và Selectors (Bộ lọc) - Trái tim kết nối của K8s
K8s không quản lý tài nguyên dựa trên mối quan hệ cha-con cứng nhắc, mà quản lý hoàn toàn bằng cơ chế **Dán nhãn & Tìm kiếm (Labels & Selectors)**.

*   **Labels (`metadata.labels`)**: Là các cặp key-value đính kèm trên đối tượng (thường là Pod). Bạn có thể coi đây là chiếc thẻ tag đeo vào từng Pod con.
    ```yaml
    metadata:
      labels:
        app: user-service
        environment: development
    ```
*   **Selector (`spec.selector.matchLabels`)**: Bộ lọc của Service/Deployment để tìm ra các Pod mục tiêu.

> [!IMPORTANT]
> **Quy tắc Vàng**: `spec.selector.matchLabels` của Service hoặc Deployment **PHẢI trùng khớp 100%** với `metadata.labels` được định nghĩa trong `spec.template.metadata.labels` của Pod tương ứng. Nếu viết lệch dù chỉ 1 ký tự, Service sẽ không thể gửi traffic vào Pod, hoặc Deployment sẽ rơi vào trạng thái tạo Pod vô hạn vì không nhận diện được Pod con đã tạo!

---

### 4.2 Replicas (Số lượng bản sao)
Nằm trong `spec` của Deployment hoặc StatefulSet. Đây đơn giản là số lượng Pod giống hệt nhau mà bạn muốn K8s phân tán và duy trì chạy đồng thời.
- Nếu bạn thiết lập `replicas: 3`, K8s luôn kiểm tra xem cụm có đúng 3 Pod đang hoạt động không.
- Nếu bạn tự tay xóa bớt 1 Pod đi, K8s phát hiện số lượng thực tế (2) nhỏ hơn số lượng cấu hình (3) ➔ Tự tạo ngay Pod thứ 3 để bù đắp.

---

### 4.3 Giải mã: Tại sao lại có `spec` nằm trong `spec`?
Khi đọc các file YAML của Deployment, bạn thường thấy có cấu trúc thụt lề lặp lại:
```yaml
spec: # 1. Spec của Deployment
  replicas: 2
  template:
    metadata:
      labels:
        app: my-app
    spec: # 2. Spec của Pod
      containers:
        - name: my-container
          image: nginx
```
#### Lý giải:
- **`spec` cấp 1 (dòng 1)**: Định nghĩa cấu hình cho **bản thân Deployment** (Ví dụ: Số lượng replicas là mấy? Selector lọc nhãn gì?).
- **`spec` cấp 2 (dòng 7)**: Nằm bên dưới `template` (khuôn mẫu). Phần này chính là **đặc tả cấu hình của Pod con** mà Deployment sẽ sinh ra (Ví dụ: Pod con chạy container gì? Dùng image nào? Gắn biến môi trường gì?).

---

## 5. Sơ đồ Liên kết & Dòng chảy Traffic giữa các Kind

Để giúp bạn hình dung bức tranh tổng thể một cách rõ ràng nhất, dưới đây là sơ đồ mô tả cách một request từ trình duyệt đi qua từng loại tài nguyên K8s để đến được code Spring Boot và ghi dữ liệu xuống database:

```
[ Trình duyệt Web máy Windows ]
         │
         │  1. Request gửi tới: http://api.bookland.local/auth/login
         ▼
┌────────────────────────────────────────────────────────┐
│                     K8s INGRESS                        │
│  - Phân tích Host: api.bookland.local                  │
│  - Phân tích Path: / (Chuyển tiếp tới api-gateway)     │
└────────────────────────┬───────────────────────────────┘
                         │
                         │  2. Điều hướng tới cổng: 8080 của Service
                         ▼
┌────────────────────────────────────────────────────────┐
│             SERVICE: api-gateway (ClusterIP)           │
│  - Nhận traffic từ cổng 8080                           │
│  - Lọc nhãn: app=api-gateway                           │
└────────────────────────┬───────────────────────────────┘
                         │
                         │  3. Cân bằng tải & đẩy traffic tới Pod
                         ▼
┌────────────────────────────────────────────────────────┐
│             POD: api-gateway (Spring Boot)             │
│  - Đón request trên containerPort: 8080                │
│  - Thực hiện logic định tuyến nội bộ                   │
│  - Gọi tiếp Service: identity-service trên port 8081   │
└────────────────────────┬───────────────────────────────┘
                         │
                         │  4. Chuyển hướng mạng nội bộ K8s
                         ▼
┌────────────────────────────────────────────────────────┐
│           SERVICE: identity-service (ClusterIP)        │
│  - Lọc nhãn: app=identity-service                      │
└────────────────────────┬───────────────────────────────┘
                         │
                         │  5. Chuyển tiếp tới Pod chạy nghiệp vụ
                         ▼
┌────────────────────────────────────────────────────────┐
│            POD: identity-service (Spring Boot)         │
│  - Nhận dữ liệu xác thực gửi lên                      │
│  - Gọi kết nối Database qua DNS: 'mysql:3306'          │
└────────────────────────┬───────────────────────────────┘
                         │
                         │  6. Đọc/Ghi dữ liệu
                         ▼
┌────────────────────────────────────────────────────────┐
│            SERVICE: mysql (Headless Service)           │
│  - Lọc nhãn: app=mysql                                 │
└────────────────────────┬───────────────────────────────┘
                         │
                         │  7. Ghi thông tin xuống ổ cứng bền vững
                         ▼
┌────────────────────────────────────────────────────────┐
│             POD: mysql-0 (StatefulSet)                 │
│  - Lưu trữ vật lý qua PersistentVolumeClaim (mysql-data)│
└────────────────────────────────────────────────────────┘
```

---

## 6. Các lỗi YAML thường gặp & Cách khắc phục nhanh

Trong quá trình soạn thảo file cấu hình Kubernetes, bạn sẽ khó tránh khỏi các lỗi cú pháp nhỏ khiến cụm không thể deploy. Dưới đây là bảng chẩn đoán nhanh lỗi:

| Hiện tượng lỗi | Nguyên nhân phổ biến | Cách khắc phục chẩn đoán |
| :--- | :--- | :--- |
| **`error: error parsing ...: error converting YAML to JSON`** | Sử dụng phím **Tab** thay vì khoảng trắng (Space) ở một dòng nào đó, hoặc thụt lề sai cấp trúc. | Dùng VS Code hoặc Sublime Text tìm và thay thế toàn bộ ký tự Tab `\t` bằng khoảng trắng. Sử dụng các trang web YAML validator online để check. |
| **Pod ở trạng thái `ImagePullBackOff`** | Tên docker image bị viết sai hoặc cụm không thể kéo ảnh từ Registry trên Cloud về. | Kiểm tra lại tên và tag ảnh. Nếu dùng ảnh nội bộ Minikube, đảm bảo đã chạy `eval $(minikube docker-env)` trước khi build và set `imagePullPolicy: IfNotPresent` trong YAML. |
| **Pod ở trạng thái `Pending` rất lâu** | Cụm Minikube của bạn bị cạn kiệt tài nguyên (CPU, RAM) để cấp phát cho Pod mới, hoặc PVC đòi dung lượng đĩa lớn hơn khả năng thực tế của Node. | Khởi chạy lệnh `kubectl describe pod <tên-pod>` và xem mục `Events` để chẩn đoán. Có thể cần tăng RAM cấp phát cho Minikube (`--memory=8192`). |
| **Service hoạt động nhưng gửi request báo lỗi `503 Service Unavailable`** | Service không tìm thấy bất kỳ Pod con nào đang chạy có nhãn trùng với cấu hình `selector` của nó. | Xem lại nhãn dán: Chạy `kubectl get pods --show-labels -n bookland` để xem nhãn thực tế của Pod, so sánh đối chiếu từng chữ cái với `selector` trong file YAML của Service. |
| **`dry-run` kiểm thử lỗi trước khi deploy thực tế** | Muốn chắc chắn file YAML viết đúng cấu trúc trước khi apply vào cluster. | Sử dụng lệnh kiểm lỗi không sinh tài nguyên của K8s:<br>`kubectl apply -f my-file.yaml --dry-run=client` |

---

> [!TIP]
> **Lời khuyên thực chiến**: Hãy cài đặt Extension **Kubernetes** và **YAML** của hãng Microsoft trên công cụ viết code **VS Code**. Nó sẽ tự động tô màu cú pháp, cảnh báo thụt lề sai dòng bằng sóng đỏ và tự động gợi ý các trường (`apiVersion`, `kind`, `metadata`, `spec`) khi bạn soạn thảo file YAML cực kỳ chuẩn xác và nhanh chóng!
