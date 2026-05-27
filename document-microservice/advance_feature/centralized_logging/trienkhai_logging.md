# Quy trình Triển khai Hệ thống Centralized Logging (EFK Stack)

Tài liệu này hướng dẫn từng bước (Step-by-Step) cấu hình mã nguồn Java, đóng gói Docker và triển khai hạ tầng thu thập log tập trung sử dụng **Elasticsearch, Filebeat và Kibana** cho hệ thống P_BookLand_MS.

---

## 1. Bản đồ Triển khai (Roadmap)

Quy trình gồm 4 giai đoạn chính:
* **Giai đoạn 1**: Thêm thư viện & Cấu hình mã nguồn (Java Spring Boot, Logback JSON).
* **Giai đoạn 2**: Triển khai & Kiểm thử trên Docker Compose (Môi trường Local Dev).
* **Giai đoạn 3**: Triển khai trên Kubernetes Minikube (Môi trường Staging/Production).
* **Giai đoạn 4**: Xác minh dòng chảy log & Sử dụng Kibana.

---

## GIAI ĐOẠN 1: Cấu hình mã nguồn (Thực hiện trên Windows Host)

### Bước 1.1: Thêm Dependency quản lý log JSON và Tracing
Mở file [pom.xml](file:///d:/Microservices/P_BookLand_MS/pom.xml) ở thư mục gốc (Parent POM) và thêm cấu hình quản lý phiên bản:

1. Thêm Micrometer Tracing BOM trong thẻ `<dependencyManagement>`:
```xml
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>io.micrometer</groupId>
            <artifactId>micrometer-tracing-bom</artifactId>
            <version>1.2.5</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>
```

2. Thêm thư viện Logstash Logback Encoder vào phần `<dependencies>` chung ở Parent POM (để áp dụng cho toàn bộ 11 microservices):
```xml
<dependencies>
    <!-- Logback Encoder xuất định dạng JSON -->
    <dependency>
        <groupId>net.logstash.logback</groupId>
        <artifactId>logstash-logback-encoder</artifactId>
        <version>7.4</version>
    </dependency>
</dependencies>
```

3. Thêm thư viện Tracing vào POM của **API Gateway** và các **Microservices** có nhu cầu bám vết (ví dụ: `user-service`, `identity-service`, `order-service`, `book-service`, `notification-service`, `chat-service`):
```xml
<!-- Bridge Micrometer -> OpenTelemetry -->
<dependency>
    <groupId>io.micrometer</groupId>
    <artifactId>micrometer-tracing-bridge-otel</artifactId>
</dependency>
<!-- Tự động propagate Trace context qua HTTP/Kafka headers -->
<dependency>
    <groupId>io.opentelemetry</groupId>
    <artifactId>opentelemetry-extension-trace-propagators</artifactId>
</dependency>
```

### Bước 1.2: Cập nhật file cấu hình YAML (`application.yml`)
Bổ sung các cấu hình sau vào `src/main/resources/application.yml` của các dịch vụ để cấu hình **Distributed Tracing** kết hợp **Giới hạn Log rác**:

```yaml
# Cấu hình Bám vết Distributed Tracing
management:
  tracing:
    sampling:
      probability: 1.0 # 1.0 = Lấy mẫu 100% request (local test). Môi trường Production khuyên dùng 0.1 (10%)
    enabled: true
  propagation:
    type: w3c # Định dạng chuẩn W3C (sử dụng header 'traceparent')

# Giới hạn Log levels - Chỉ gom log nghiệp vụ thực tế & Lỗi
logging:
  level:
    root: WARN                   # Mặc định chỉ log WARN và ERROR từ bên thứ ba
    com.bookland: INFO            # Ghi log nghiệp vụ thực tế của hệ thống chúng ta
    org.springframework: WARN     # Tắt bớt log INFO dài dòng lúc khởi tạo của Spring
    org.springframework.web: INFO # Giữ lại log URL endpoints của Web/Gateway
    org.hibernate.SQL: WARN       # TẮT logs câu lệnh SELECT chi tiết của Hibernate trong production
    org.hibernate.type.descriptor.sql.BasicBinder: WARN # Tắt logs binding parameters của JPA
    org.apache.kafka: WARN        # Tắt log heartbeat polling liên tục của Kafka consumer
    org.apache.zookeeper: WARN    # Tắt log duy trì kết nối zookeeper
```

### Bước 1.3: Tạo tệp `logback-spring.xml`
Tại thư mục `src/main/resources/` của từng microservice, tạo tệp `logback-spring.xml` để điều hướng log tùy thuộc vào môi trường (local chạy console thường, docker/k8s chạy console JSON):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <include resource="org/springframework/boot/logging/logback/defaults.xml"/>

    <!-- LOCAL Profile: In log ra Console có màu sắc rõ ràng, dễ nhìn -->
    <springProfile name="local">
        <appender name="CONSOLE" class="ch.qos.logback.core.ConsoleAppender">
            <encoder>
                <pattern>%d{yyyy-MM-dd HH:mm:ss.SSS} [%X{traceId:-NoTrace}] %highlight(%-5level) [%.15t] %cyan(%-40.40logger{39}) : %msg%n</pattern>
            </encoder>
        </appender>
        <root level="INFO">
            <appender-ref ref="CONSOLE"/>
        </root>
    </springProfile>

    <!-- DOCKER/K8S (Không phải local): In log dạng JSON có đầy đủ traceId, level, message -->
    <springProfile name="!local">
        <appender name="JSON_CONSOLE" class="ch.qos.logback.core.ConsoleAppender">
            <encoder class="net.logstash.logback.encoder.LoggingEventCompositeJsonEncoder">
                <providers>
                    <timestamp>
                        <timeZone>UTC</timeZone>
                    </timestamp>
                    <logLevel/>
                    <threadName/>
                    <loggerName/>
                    <message/>
                    <contextName/>
                    <mdc/> <!-- In ra toàn bộ key trong MDC bao gồm traceId, spanId -->
                    <stackTrace>
                        <fieldName>exception</fieldName>
                    </stackTrace>
                </providers>
            </encoder>
        </appender>
        <root level="INFO">
            <appender-ref ref="JSON_CONSOLE"/>
        </root>
    </springProfile>
</configuration>
```

---

## GIAI ĐOẠN 2: Triển khai & Kiểm thử trên Docker Compose (Local Dev)

Môi trường local dùng để kiểm thử khả năng tích hợp nhanh giữa Filebeat -> Elasticsearch -> Kibana.

### Bước 2.1: Bổ sung Kibana & Filebeat vào [docker-compose.yml](file:///d:/Microservices/P_BookLand_MS/docker-compose.yml)
Mở file [docker-compose.yml](file:///d:/Microservices/P_BookLand_MS/docker-compose.yml) và thêm 2 service này bên dưới service `elasticsearch`:

```yaml
  # Kibana — Giao diện UI Web để xem logs
  kibana:
    image: docker.elastic.co/kibana/kibana:8.11.0
    container_name: bookland-kibana
    ports:
      - "5601:5601"
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    depends_on:
      - elasticsearch

  # Filebeat — Agent gom log các containers
  filebeat:
    image: docker.elastic.co/beats/filebeat:8.11.0
    container_name: bookland-filebeat
    user: root
    volumes:
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./filebeat.yml:/usr/share/filebeat/filebeat.yml:ro
    depends_on:
      - elasticsearch
```

### Bước 2.2: Tạo tệp cấu hình `./filebeat.yml`
Tạo tệp `filebeat.yml` ở cùng thư mục chứa `docker-compose.yml`:

```yaml
filebeat.inputs:
  - type: container
    paths:
      - '/var/lib/docker/containers/*/*.log'
    # Phân tích cú pháp JSON để đưa các trường ra gốc
    json.keys_under_root: true
    json.overwrite_keys: true
    json.add_error_key: true
    processors:
      - add_docker_metadata: ~
      # LOẠI BỎ logs ping health check liên tục của Kubernetes/Docker
      - drop_event:
          when:
            or:
              - contains:
                  message: "/actuator/"
              - contains:
                  message: "/health"

output.elasticsearch:
  hosts: ["http://elasticsearch:9200"]
  index: "bookland-logs-%{+yyyy.MM.dd}"

setup.template.name: "bookland"
setup.template.pattern: "bookland-logs-*"
setup.ilm.enabled: false
```

### Bước 2.3: Chạy hệ thống local và Xác minh
1. Khởi động lại hệ thống với profile `docker`:
   ```bash
   docker-compose down
   docker-compose --profile docker up --build -d
   ```
2. Gọi API bất kỳ qua Gateway, ví dụ: `GET http://localhost:8080/api/users/hello`
3. Truy cập Kibana tại: `http://localhost:5601`
4. Vào **Management** > **Data Views** > Tạo Data View mới với Pattern `bookland-logs-*`.
5. Vào mục **Discover** để tìm kiếm logs theo `traceId` và xem các log liên quan từ API Gateway đến User Service.

---

## GIAI ĐOẠN 3: Triển khai trên Kubernetes Minikube (Ubuntu VM)

Trong môi trường Minikube, do các pods thay đổi địa chỉ IP và node thường xuyên, chúng ta sẽ cài đặt Filebeat dưới dạng **DaemonSet** (thu thập log trên node host) và **Kibana** dưới dạng Deployment.

### Bước 3.1: Triển khai Kibana
Tạo file Manifest `k8s/01-infrastructure/kibana.yaml` để chạy Kibana kết nối đến Service `elasticsearch` nội bộ:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kibana
  namespace: bookland
  labels:
    app: kibana
spec:
  replicas: 1
  selector:
    matchLabels:
      app: kibana
  template:
    metadata:
      labels:
        app: kibana
    spec:
      containers:
        - name: kibana
          image: docker.elastic.co/kibana/kibana:8.11.0
          ports:
            - containerPort: 5601
              name: ui-port
          env:
            - name: ELASTICSEARCH_HOSTS
              value: "http://elasticsearch:9200"
---
apiVersion: v1
kind: Service
metadata:
  name: kibana
  namespace: bookland
spec:
  ports:
    - port: 5601
      targetPort: 5601
  selector:
    app: kibana
```

### Bước 3.2: Triển khai Filebeat DaemonSet và RBAC Roles
Filebeat cần giao tiếp với Kubernetes API Server để lấy metadata của Pod (tên Pod, Namespace, Labels). Ta cần định nghĩa Role RBAC thích hợp.

Tạo file Manifest `k8s/01-infrastructure/filebeat.yaml`:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: filebeat
  namespace: bookland
  labels:
    app: filebeat
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: filebeat
  labels:
    app: filebeat
rules:
- apiGroups: [""] # Quyền xem namespaces, pods, nodes của cụm K8s
  resources:
  - namespaces
  - pods
  - nodes
  verbs:
  - get
  - watch
  - list
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: filebeat
  labels:
    app: filebeat
subjects:
- kind: ServiceAccount
  name: filebeat
  namespace: bookland
roleRef:
  kind: ClusterRole
  name: filebeat
  apiGroup: rbac.authorization.k8s.io
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: filebeat-config
  namespace: bookland
  labels:
    app: filebeat
data:
  filebeat.yml: |-
    filebeat.inputs:
    - type: container
      paths:
        - /var/log/containers/*.log
      processors:
        - add_kubernetes_metadata:
            host: ${NODE_NAME}
            matchers:
            - logs_path:
                logs_path: "/var/log/containers/"

    # Các bộ xử lý log
    processors:
      # 1. Tự động parse chuỗi log JSON trong console ra các trường riêng biệt
      - decode_json_fields:
          fields: ["message"]
          target: ""
          overwrite_keys: true
          add_error_key: true
      # 2. Bộ lọc LOẠI BỎ logs ping health check liên tục của Kubernetes (Probes)
      - drop_event:
          when:
            or:
              - contains:
                  message: "/actuator/"
              - contains:
                  message: "/health"

    output.elasticsearch:
      hosts: ['elasticsearch:9200']
      index: "bookland-k8s-logs-%{+yyyy.MM.dd}"
    
    setup.ilm.enabled: false
    setup.template.name: "bookland-k8s"
    setup.template.pattern: "bookland-k8s-*"
---
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: filebeat
  namespace: bookland
  labels:
    app: filebeat
spec:
  selector:
    matchLabels:
      app: filebeat
  template:
    metadata:
      labels:
        app: filebeat
    spec:
      serviceAccountName: filebeat
      terminationGracePeriodSeconds: 30
      hostNetwork: true
      dnsPolicy: ClusterFirstWithHostNet
      containers:
      - name: filebeat
        image: docker.elastic.co/beats/filebeat:8.11.0
        args: [
          "-c", "/etc/filebeat.yml",
          "-e",
        ]
        env:
        - name: NODE_NAME
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
        securityContext:
          runAsUser: 0 # Chạy quyền root để đọc log hệ thống trên máy host
        resources:
          limits:
            memory: 250Mi
          requests:
            cpu: 100m
            memory: 100Mi
        volumeMounts:
        - name: config
          mountPath: /etc/filebeat.yml
          subPath: filebeat.yml
          readOnly: true
        - name: data
          mountPath: /usr/share/filebeat/data
        - name: varlog
          mountPath: /var/log
          readOnly: true
        - name: varlibdockercontainers
          mountPath: /var/lib/docker/containers
          readOnly: true
      volumes:
      - name: config
        configMap:
          defaultMode: 0640
          name: filebeat-config
      - name: varlog
        hostPath:
          path: /var/log
      - name: varlibdockercontainers
        hostPath:
          path: /var/lib/docker/containers
      - name: data
        hostPath:
          path: /var/lib/filebeat-data
          type: DirectoryOrCreate
```

### Bước 3.3: Chạy lệnh triển khai hạ tầng K8s
Mở terminal máy ảo Ubuntu của bạn và thực hiện các lệnh sau:

```bash
# 1. Triển khai Kibana và Filebeat DaemonSet
kubectl apply -f k8s/01-infrastructure/kibana.yaml
kubectl apply -f k8s/01-infrastructure/filebeat.yaml

# 2. Kiểm tra xem các pod đã ở trạng thái Running chưa
kubectl get pods -n bookland | grep -E 'kibana|filebeat'
```

---

## GIAI ĐOẠN 4: Xác minh dòng chảy log & Sử dụng Kibana

### Bước 4.1: Mở cổng truy cập Kibana từ máy Windows
Để truy cập vào trang quản trị Kibana từ máy Windows Host, bạn cần chuyển tiếp cổng của dịch vụ `kibana` ra ngoài:

1. Chạy lệnh `port-forward` trên terminal máy ảo Ubuntu:
   ```bash
   kubectl port-forward --address 0.0.0.0 service/kibana 5601:5601 -n bookland
   ```
2. Trên trình duyệt Windows Host, truy cập: `http://api.bookland.local:5601` (hoặc `http://<IP-máy-ảo-Ubuntu>:5601`).

### Bước 4.2: Cấu hình Data View trên Kibana
1. Khi vào giao diện Kibana, chọn biểu tượng Menu ở góc trên bên trái > **Analytics** > **Discover**.
2. Hệ thống sẽ yêu cầu tạo một **Data View** mới (nếu là lần đầu sử dụng):
   * **Name**: Nhập `BookLand Logs`
   * **Index pattern**: Nhập `bookland-k8s-logs-*`
   * **Timestamp field**: Chọn `@timestamp`
   * Nhấp chọn **Create data view**.

### Bước 4.3: Truy vấn lỗi theo Trace ID
Khi Client gọi một API và gặp lỗi (ví dụ API trả về HTTP Status `500 Internal Server Error` kèm Response Body chứa Trace ID), bạn có thể dễ dàng lọc toàn bộ các log liên quan bằng cách gõ vào thanh tìm kiếm (KQL) của Kibana:

```kql
traceId : "mã-trace-id-của-bạn"
```

Kibana sẽ lập tức liệt kê tất cả các bước đi của request đó:
* Lịch trình nhận request tại `api-gateway`.
* Tiến trình xử lý tại `order-service`.
* Các truy vấn dữ liệu từ `book-service`.
* Thông điệp sự kiện đẩy qua Kafka đến `notification-service`.

> [!NOTE]
> **Mẹo xử lý sự cố (Troubleshooting):**
> Nếu không thấy log xuất hiện trên Kibana:
> 1. Kiểm tra log của filebeat pod xem có gặp lỗi kết nối tới Elasticsearch hay không:
>    ```bash
>    kubectl logs -f daemonset/filebeat -n bookland
>    ```
> 2. Đảm bảo các pod Spring Boot đã được chạy với Profile không phải `local` (ví dụ: `prod` hoặc `docker`) để kích hoạt log định dạng JSON. Bạn có thể kiểm tra log thô của pod Spring:
>    ```bash
>    kubectl logs deployment/user-service -n bookland | head -n 5
>    ```
>    (Xem log in ra có bắt đầu bằng dấu `{` đại diện cho đối tượng JSON hay không).
