# Kế hoạch Triển khai Centralized Logging cho Hệ thống P_BookLand_MS

Tài liệu này nghiên cứu, so sánh và lập kế hoạch chi tiết để triển khai hệ thống **Centralized Logging (Ghi log tập trung)** và **Distributed Tracing (Bám vết phân tán)** cho hệ thống Microservices P_BookLand_MS của bạn.

---

## 1. Giới thiệu & Mục tiêu

Với hệ thống hiện tại gồm **11 dịch vụ độc lập** (Gateway, Identity, User, Book, Order, Event, Notification, File, Search, Chat, Chatbot) chạy trên Docker Compose hoặc Kubernetes (Minikube), việc dò tìm lỗi (debug) bằng cách xem log thủ công của từng container/pod là cực kỳ khó khăn.

**Mục tiêu hệ thống Centralized Logging:**
1. **Distributed Tracing (Liên kết vết)**: Mỗi request từ Client khi đi qua API Gateway sẽ được gán một `Trace ID` duy nhất. Trace ID này sẽ tự động đi theo request qua các cuộc gọi HTTP (OpenFeign) hoặc các thông điệp hàng đợi (Kafka Record Headers).
2. **Structured Logging (Log cấu trúc)**: Đổi định dạng log từ Plain Text thông thường sang **JSON format** (khi chạy ở môi trường Docker/K8s) giúp các Agent thu thập dễ dàng parse và index.
3. **Centralized Log Aggregation (Thu thập tập trung)**: Tự động gom log từ luồng ra stdout/stderr của tất cả các container/pod về một DB lưu trữ tập trung.
4. **Log Trực quan (Visualization)**: Cung cấp giao diện Web (Kibana hoặc Grafana) để tìm kiếm log theo `Trace ID`, `Level` (INFO, ERROR, WARN), `Service Name`, hoặc `Time range`.

---

## 2. So sánh giải pháp & Lựa chọn Kiến trúc

Dựa trên cấu hình hạ tầng hiện có trong file [docker-compose.yml](file:///d:/Microservices/P_BookLand_MS/docker-compose.yml) và cấu hình Kubernetes trong [trienkhai.md](file:///d:/Microservices/P_BookLand_MS/document-microservice/trienkhai_kubenetes/trienkhai.md), chúng ta có hai hướng đi chính:

### Giải pháp A: EFK Stack (Elasticsearch + Filebeat + Kibana)
Hệ thống của bạn **đã có sẵn Elasticsearch** (đang dùng cho `search-service`). Đây là một lợi thế cực lớn giúp tiết kiệm tài nguyên cài đặt database mới.
* **Cơ chế**: 
  1. Các dịch vụ Spring Boot ghi log ra console dạng JSON.
  2. **Filebeat** (chạy dưới dạng Container hoặc K8s DaemonSet) thu thập trực tiếp file log của Docker/K8s trên máy host, parse JSON và gửi thẳng về **Elasticsearch**.
  3. **Kibana** được cài thêm làm giao diện UI để phân tích và tra cứu log.
* **Mức tiêu hao tài nguyên**: Trung bình (Kibana cần thêm khoảng ~512MB RAM, Elasticsearch đã chạy sẵn nên không tốn thêm quá nhiều bộ nhớ).

### Giải pháp B: PLG Stack (Promtail + Loki + Grafana)
Giải pháp Cloud-native hiện đại rất phổ biến trong môi trường Kubernetes.
* **Cơ chế**:
  1. Các dịch vụ ghi log ra console.
  2. **Promtail** thu thập log và đẩy về **Loki** (Log database nhẹ hơn Elasticsearch nhiều lần vì chỉ đánh index cho metadata/labels chứ không index toàn bộ text).
  3. **Grafana** (giao diện dashboard trực quan) kết nối Loki làm Data Source để xem log.
* **Mức tiêu hao tài nguyên**: Rất thấp (Loki + Promtail chỉ tốn ~150-200MB RAM, phù hợp khi chạy máy ảo Minikube có RAM hạn chế).

### Bảng So sánh Chi tiết

| Tiêu chí | EFK Stack (Filebeat + Elasticsearch + Kibana) | PLG Stack (Promtail + Loki + Grafana) |
| :--- | :--- | :--- |
| **Tận dụng hạ tầng có sẵn** | **Có** (đã có sẵn Elasticsearch trong dự án). | **Không** (phải cài thêm Loki và Grafana). |
| **Tiêu hao RAM/CPU** | Trung bình - Cao (Kibana khá nặng). | Rất nhẹ (Loki và Grafana tối ưu hóa tốt). |
| **Độ phức tạp Cú pháp tìm kiếm** | Dễ (Lucene query hoặc KQL rất trực quan). | Cần học (Sử dụng LogQL, hơi khó với người mới). |
| **Khả năng Lưu trữ & Index** | Index toàn bộ text (Tìm kiếm full-text cực nhanh). | Chỉ index nhãn metadata (Lưu trữ nén tốt, rẻ hơn). |
| **Độ tương thích** | Hoàn hảo cho doanh nghiệp lớn. | Rất tốt cho hệ thống vừa/nhỏ, Kubernetes-native. |

> [!TIP]
> **Khuyến nghị lựa chọn:**
> 1. Nếu RAM máy ảo Ubuntu chạy Minikube của bạn dư dả (trên 8GB), hãy chọn **EFK Stack** vì đã có sẵn Elasticsearch, bạn chỉ cần triển khai thêm Filebeat và Kibana.
> 2. Nếu RAM máy ảo bị giới hạn (dưới 8GB) hoặc muốn cấu hình nhẹ tối đa, hãy chọn **PLG Stack**. 
>
> Dưới đây tài liệu sẽ hướng dẫn cấu hình mã nguồn Java (áp dụng chung) và cung cấp file cấu hình cho **cả hai giải pháp** để bạn tùy ý chọn lựa.

---

## 3. Thiết kế Distributed Tracing (Trace ID) trong Spring Boot 3.2.5

Spring Boot 3.2.5 sử dụng **Micrometer Tracing** (thay thế cho Spring Cloud Sleuth ở Spring Boot 2.x). Chúng ta sẽ thiết lập để tự động tạo `traceId` và `spanId` đưa vào MDC (Mapped Diagnostic Context) của log.

### Giải pháp 1: Sử dụng Micrometer Tracing & OpenTelemetry (Khuyên dùng)
Cách này tự động bám vết tất cả WebFlux (Gateway), Web MVC (Services), OpenFeign, và Kafka mà không cần viết nhiều code thủ công.

#### Bước 1.1: Cấu hình Parent [pom.xml](file:///d:/Microservices/P_BookLand_MS/pom.xml)
Khai báo dependencies quản lý phiên bản trong `dependencyManagement`:

```xml
<dependencyManagement>
    <dependencies>
        <!-- Micrometer Tracing Bill of Materials -->
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

#### Bước 1.2: Thêm Dependency vào các Service cần Tracing
Thêm các thư viện sau vào `pom.xml` của các microservice cần bám vết:

```xml
<!-- Bridge chuyển đổi Micrometer sang định dạng OpenTelemetry -->
<dependency>
    <groupId>io.micrometer</groupId>
    <artifactId>micrometer-tracing-bridge-otel</artifactId>
</dependency>
<!-- Tự động propagate context (truyền Trace ID) qua HTTP/Kafka Headers -->
<dependency>
    <groupId>io.opentelemetry</groupId>
    <artifactId>opentelemetry-extension-trace-propagators</artifactId>
</dependency>
```

#### Bước 1.3: Cấu hình `application.yml` chung cho các Service
Để kích hoạt việc đưa Trace ID vào MDC tự động và cấu hình tỷ lệ lấy mẫu trace (sampling rate):

```yaml
management:
  tracing:
    sampling:
      probability: 1.0 # Lấy mẫu 100% request (local/dev). Production nên để 0.1 (10%)
    enabled: true
  propagation:
    type: w3c # Định dạng truyền header chuẩn W3C (traceparent)
```

---

### Giải pháp 2: Tự viết Custom Filter & Interceptor (Nhẹ nhất, không dùng thư viện ngoài)
Nếu không muốn thêm các dependency quản lý giám sát nặng nề, bạn có thể tự viết code Java để truyền Trace ID qua header `X-Correlation-Id`.

#### A. Tại API Gateway: Tạo Global Filter tạo Trace ID
Tạo tệp `TraceIdFilter.java` trong `api-gateway`:

```java
package com.bookland.gateway.config;

import org.slf4j.MDC;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.util.UUID;

@Component
public class TraceIdFilter implements GlobalFilter, Ordered {

    private static final String CORRELATION_ID_HEADER = "X-Correlation-Id";

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String correlationId = exchange.getRequest().getHeaders().getFirst(CORRELATION_ID_HEADER);
        
        if (correlationId == null || correlationId.isEmpty()) {
            correlationId = UUID.randomUUID().toString().replace("-", "");
        }

        // Đưa Trace ID vào Request Header để truyền xuống các service phía sau
        ServerHttpRequest mutatedRequest = exchange.getRequest().mutate()
                .header(CORRELATION_ID_HEADER, correlationId)
                .build();

        // Ghi nhận Trace ID vào Response Header để client dễ đối chiếu khi gặp lỗi
        exchange.getResponse().getHeaders().add(CORRELATION_ID_HEADER, correlationId);

        return chain.filter(exchange.mutate().request(mutatedRequest).build());
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE; // Chạy đầu tiên trước cả bộ lọc Auth
    }
}
```

#### B. Tại các Microservices phía sau: WebMvc Config & MDC Interceptor
Tạo Interceptor để nhận diện `X-Correlation-Id` và đưa vào MDC của log:

```java
package com.bookland.shared.logging;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class CorrelationIdInterceptor implements HandlerInterceptor {

    private static final String CORRELATION_ID_HEADER = "X-Correlation-Id";
    private static final String MDC_TRACE_ID_KEY = "traceId";

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        String correlationId = request.getHeader(CORRELATION_ID_HEADER);
        if (correlationId != null) {
            MDC.put(MDC_TRACE_ID_KEY, correlationId);
        } else {
            MDC.put(MDC_TRACE_ID_KEY, java.util.UUID.randomUUID().toString().replace("-", ""));
        }
        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        MDC.remove(MDC_TRACE_ID_KEY); // Clean up tránh memory leak thread pool
    }
}
```
*Đăng ký Interceptor này vào lớp kế thừa `WebMvcConfigurer` của ứng dụng.*

#### C. Truyền Trace ID qua OpenFeign (HTTP Client calls)
Tạo một Bean `RequestInterceptor` để tự động đính kèm `X-Correlation-Id` vào các cuộc gọi qua Feign Client:

```java
package com.bookland.shared.config;

import feign.RequestInterceptor;
import feign.RequestTemplate;
import org.slf4j.MDC;
import org.springframework.context.annotation.Configuration;

@Configuration
public class FeignClientInterceptor implements RequestInterceptor {

    private static final String CORRELATION_ID_HEADER = "X-Correlation-Id";
    private static final String MDC_TRACE_ID_KEY = "traceId";

    @Override
    public void apply(RequestTemplate template) {
        String traceId = MDC.get(MDC_TRACE_ID_KEY);
        if (traceId != null) {
            template.header(CORRELATION_ID_HEADER, traceId);
        }
    }
}
```

#### D. Truyền Trace ID qua Apache Kafka Headers
Khi một service gửi Message qua Kafka (ví dụ Order gửi sang Notification), ta truyền Trace ID qua headers của Kafka Record:

* **Bên gửi (Producer)**:
```java
ProducerRecord<String, Object> record = new ProducerRecord<>("order-events", orderEvent);
String traceId = MDC.get("traceId");
if (traceId != null) {
    record.headers().add("X-Correlation-Id", traceId.getBytes(StandardCharsets.UTF_8));
}
kafkaTemplate.send(record);
```

* **Bên nhận (Consumer)**:
```java
@KafkaListener(topics = "order-events", groupId = "notification-group")
public void listen(ConsumerRecord<String, Object> record) {
    Header traceHeader = record.headers().lastHeader("X-Correlation-Id");
    if (traceHeader != null) {
        String traceId = new String(traceHeader.value(), StandardCharsets.UTF_8);
        MDC.put("traceId", traceId);
    }
    try {
        // Thực hiện xử lý nghiệp vụ gửi thông báo
        log.info("Processing order notification...");
    } finally {
        MDC.remove("traceId");
    }
}
```

---

## 4. Định dạng Log dạng JSON bằng Logback

Để Filebeat hoặc Promtail dễ dàng gom log, log ghi ra console cần có định dạng JSON chuẩn thay vì Plain text.

### Bước 4.1: Thêm thư viện Encoder JSON vào POM
Thêm dependency này vào parent [pom.xml](file:///d:/Microservices/P_BookLand_MS/pom.xml) (hoặc trực tiếp các service):

```xml
<dependency>
    <groupId>net.logstash.logback</groupId>
    <artifactId>logstash-logback-encoder</artifactId>
    <version>7.4</version>
</dependency>
```

### Bước 4.2: Thiết lập file `logback-spring.xml` chung cho các Service
Tạo tệp `src/main/resources/logback-spring.xml` ở từng service. Cấu hình này hỗ trợ:
* Ghi log console màu thông thường khi chạy thử ở máy cá nhân (`local` profile).
* Ghi log định dạng JSON khi deploy lên Docker Compose/K8s (`prod` hoặc `docker` profile).

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <include resource="org/springframework/boot/logging/logback/defaults.xml"/>

    <!-- Profile Local: Ghi log có màu dễ đọc cho nhà phát triển -->
    <springProfile name="local">
        <appender name="CONSOLE" class="ch.qos.logback.core.ConsoleAppender">
            <encoder>
                <!-- Bao gồm định dạng: Thời gian [TraceId] Level Thread Logger - Message -->
                <pattern>%d{yyyy-MM-dd HH:mm:ss.SSS} [%X{traceId:-NoTrace}] %highlight(%-5level) [%.15t] %cyan(%-40.40logger{39}) : %msg%n</pattern>
            </encoder>
        </appender>
        <root level="INFO">
            <appender-ref ref="CONSOLE"/>
        </root>
    </springProfile>

    <!-- Profile Docker/K8s: Ghi log dạng JSON chuẩn -->
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
                    <mdc/> <!-- Tự động bóc toàn bộ trường MDC bao gồm traceId, spanId -->
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

## 5. Triển khai Hệ thống Log Aggregator trên Docker Compose

Nếu bạn muốn chạy thử nghiệm local bằng Docker Compose, hãy bổ sung các cấu hình sau:

### Phương án A: Tích hợp Kibana & Filebeat (Nếu dùng Elasticsearch sẵn có)

Bổ sung Kibana và Filebeat vào file [docker-compose.yml](file:///d:/Microservices/P_BookLand_MS/docker-compose.yml):

```yaml
  # Kibana — Giao diện hiển thị cho Elasticsearch
  kibana:
    image: docker.elastic.co/kibana/kibana:8.11.0
    container_name: bookland-kibana
    ports:
      - "5601:5601"
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    depends_on:
      - elasticsearch

  # Filebeat — Đi gom file log docker trên máy chủ và đẩy sang Elasticsearch
  filebeat:
    image: docker.elastic.co/beats/filebeat:8.11.0
    container_name: bookland-filebeat
    user: root
    volumes:
      # Mount thư mục log container của Docker engine trên host
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
      - /var/run/docker.sock:/var/run/docker.sock:ro
      # Cấu hình filebeat
      - ./filebeat.yml:/usr/share/filebeat/filebeat.yml:ro
    depends_on:
      - elasticsearch
```

Tạo tệp cấu hình `./filebeat.yml` ở thư mục gốc dự án:

```yaml
filebeat.inputs:
  - type: container
    paths:
      - '/var/lib/docker/containers/*/*.log'
    # Parse cấu trúc log dạng JSON từ stdout của Spring Boot
    json.keys_under_root: true
    json.overwrite_keys: true
    json.add_error_key: true
    processors:
      - add_docker_metadata: ~

output.elasticsearch:
  hosts: ["http://elasticsearch:9200"]
  index: "bookland-logs-%{+yyyy.MM.dd}"

setup.template.name: "bookland"
setup.template.pattern: "bookland-logs-*"
```

---

### Phương án B: Tích hợp PLG Stack (Promtail + Loki + Grafana)

Bổ sung vào file [docker-compose.yml](file:///d:/Microservices/P_BookLand_MS/docker-compose.yml):

```yaml
  # Loki — Log Database
  loki:
    image: grafana/loki:2.9.2
    container_name: bookland-loki
    ports:
      - "3100:3100"
    command: -config.file=/etc/loki/local-config.yaml

  # Promtail — Agent thu thập log
  promtail:
    image: grafana/promtail:2.9.2
    container_name: bookland-promtail
    volumes:
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./promtail-config.yml:/etc/promtail/config.yml
    command: -config.file=/etc/promtail/config.yml
    depends_on:
      - loki

  # Grafana — Dashboard phân tích dữ liệu log/metrics
  grafana:
    image: grafana/grafana:10.2.2
    container_name: bookland-grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    depends_on:
      - loki
```

Tạo file cấu hình `./promtail-config.yml` ở thư mục gốc:

```yaml
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: docker-logs
    docker_sd_configs:
      - host: unix:///var/run/docker.sock
        refresh_interval: 5s
    relabel_configs:
      - source_labels: ['__meta_docker_container_name']
        regex: '/(.*)'
        target_label: 'container'
```

---

## 6. Kế hoạch Triển khai trên Kubernetes (Minikube)

Khi triển khai trên Minikube theo hướng dẫn trong [trienkhai.md](file:///d:/Microservices/P_BookLand_MS/document-microservice/trienkhai_kubenetes/trienkhai.md), chúng ta sẽ tận dụng cụm Elasticsearch có sẵn trên k8s và triển khai Kibana + Filebeat.

### File Manifest 1: Triển khai Kibana (`k8s/01-infrastructure/kibana.yaml`)

Tạo file này để bật giao diện Kibana trong K8s:

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

### File Manifest 2: Triển khai Filebeat DaemonSet (`k8s/01-infrastructure/filebeat.yaml`)

Filebeat chạy dưới dạng **DaemonSet** (mỗi Node vật lý chạy đúng 1 pod) để quét thư mục log `/var/log/containers/*` của Kubernetes.

```yaml
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

    # Cấu hình parse log JSON tự động cho các pod trong namespace 'bookland'
    processors:
      - decode_json_fields:
          fields: ["message"]
          target: ""
          overwrite_keys: true
          add_error_key: true

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
      serviceAccountName: filebeat-service-account # Cần cấp quyền RBAC đọc metadata K8s
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
          runAsUser: 0 # Chạy quyền root để đọc log hệ thống
        resources:
          limits:
            memory: 200Mi
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
*(Ghi chú: Đi kèm với Filebeat DaemonSet cần có định nghĩa ServiceAccount, ClusterRole và ClusterRoleBinding cấp quyền cho Filebeat lấy thông tin Pod Metadata từ Kubernetes API Server).*

---

## 7. Lộ trình Thực hiện Từng bước (Action Plan)

Để triển khai thành công mà không làm ảnh hưởng đến hệ thống hiện tại, hãy làm theo quy trình 4 bước:

### Bước 1: Chuẩn bị mã nguồn Java (Thực hiện trên Windows Host)
1. Thêm các dependencies `micrometer-tracing` và `logstash-logback-encoder` vào parent [pom.xml](file:///d:/Microservices/P_BookLand_MS/pom.xml).
2. Tạo file `logback-spring.xml` cho toàn bộ **11 services** tại thư mục `src/main/resources/`.
3. Bật cấu hình `management.tracing` trong các file `application.yml` của các dịch vụ.
4. Đẩy (Push) code lên Git (nhánh `dev`) để chuẩn bị đồng bộ sang Ubuntu VM.

### Bước 2: Triển khai thử nghiệm trên Docker Compose
1. Bổ sung cấu hình Kibana & Filebeat (hoặc PLG stack) vào [docker-compose.yml](file:///d:/Microservices/P_BookLand_MS/docker-compose.yml).
2. Khởi động hệ thống local:
   ```bash
   docker-compose up --build -d
   ```
3. Truy cập thử giao diện Kibana tại `http://localhost:5601` (hoặc Grafana `http://localhost:3000`) để kiểm tra xem log của các service đã đổ về đầy đủ hay chưa.

### Bước 3: Đóng gói và cập nhật trên Kubernetes Minikube (Ubuntu VM)
1. Kéo (Pull) code mới nhất về máy ảo Ubuntu.
2. Build lại các Docker Images theo hướng dẫn ở giai đoạn 3 của [trienkhai.md](file:///d:/Microservices/P_BookLand_MS/document-microservice/trienkhai_kubenetes/trienkhai.md).
3. Triển khai hạ tầng logging:
   ```bash
   kubectl apply -f k8s/01-infrastructure/kibana.yaml
   kubectl apply -f k8s/01-infrastructure/filebeat.yaml
   ```
4. Cập nhật lại các Stateful/Stateless services trên K8s bằng lệnh `kubectl apply -f k8s/02-services/`.

### Bước 4: Kiểm tra bám vết Trace ID
1. Thực hiện một cuộc gọi API qua Gateway, ví dụ `POST /api/orders` (tạo đơn hàng).
2. Kiểm tra log của `api-gateway`, `order-service`, `book-service` và `notification-service`.
3. Đảm bảo rằng **cùng một Trace ID** xuất hiện trên toàn bộ chuỗi log của các service này trên Kibana/Grafana.
