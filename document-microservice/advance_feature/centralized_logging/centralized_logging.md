# Kế hoạch Triển khai Centralized Logging (EFK Stack) cho P_BookLand_MS

Tài liệu này chi tiết hóa kế hoạch triển khai hệ thống **Centralized Logging (Ghi log tập trung)** và **Distributed Tracing (Bám vết phân tán)** sử dụng **EFK Stack** cho hệ thống Microservices P_BookLand_MS.

---

## 1. Giới thiệu & Mục tiêu

Với hệ thống hiện tại gồm **11 dịch vụ độc lập** chạy trên Docker Compose hoặc Kubernetes (Minikube), việc dò tìm lỗi (debug) bằng cách xem log thủ công của từng container/pod là cực kỳ khó khăn.

**Mục tiêu hệ thống Centralized Logging:**
1. **Distributed Tracing (Liên kết vết)**: Mỗi request từ Client khi đi qua API Gateway sẽ được gán một `Trace ID` duy nhất. Trace ID này tự động đi theo request qua các cuộc gọi HTTP (OpenFeign) hoặc các thông điệp hàng đợi (Kafka Record Headers).
2. **Structured Logging (Log cấu trúc)**: Đổi định dạng log từ Plain Text thông thường sang **JSON format** (khi chạy ở môi trường Docker/K8s) giúp Filebeat dễ dàng parse và Elasticsearch đánh index hiệu quả.
3. **Centralized Log Aggregation (Thu thập tập trung)**: Tự động gom log từ stdout/stderr của tất cả các container/pod về Elasticsearch.
4. **Log Trực quan (Visualization)**: Cung cấp giao diện Web Kibana để tìm kiếm log theo `Trace ID`, `Level` (INFO, ERROR, WARN), `Service Name`, hoặc khoảng thời gian.

---

## 2. Kiến trúc Giải pháp: EFK Stack (Elasticsearch + Filebeat + Kibana)

Hệ thống của bạn **đã có sẵn Elasticsearch** (đang dùng cho `search-service` trên cổng `9200`). Giải pháp EFK tận dụng tối đa hạ tầng này để tối ưu hóa tài nguyên.

```
[ Client Request ] 
       │
       ▼
 ┌───────────┐      HTTP (Traceparent)     ┌──────────────────┐
 │  Gateway  │ ──────────────────────────> │ Business Service │
 └───────────┘                             └──────────────────┘
       │                                             │
       ▼ (Stdout JSON Logs)                          ▼ (Stdout JSON Logs)
 ┌────────────────────────────────────────────────────────────────────────┐
 │                      Container Engine log files                        │
 └────────────────────────────────────────────────────────────────────────┘
       │
       ▼ (Harvester / Read files)
 ┌───────────┐
 │ Filebeat  │  (Log Collector Agent - DaemonSet/Container)
 └───────────┘
       │
       ▼ (Bulk API - Send logs)
 ┌───────────────┐
 │ Elasticsearch │ (Log Storage & Index Database - Port 9200)
 └───────────────┘
       ▲
       │ (Query logs)
 ┌───────────┐
 │  Kibana   │ (Visualization & UI - Port 5601)
 └───────────┘
```

* **Elasticsearch**: Nơi lưu trữ, đánh chỉ mục (index) và cung cấp API tìm kiếm log nhanh chóng.
* **Filebeat**: Agent siêu nhẹ chạy trên từng máy chủ (Docker) hoặc từng node (K8s DaemonSet). Filebeat đọc trực tiếp file log của các container, giải mã định dạng JSON và đẩy về Elasticsearch bằng Bulk API.
* **Kibana**: Cung cấp giao diện Web trực quan để thực hiện các câu truy vấn KQL (Kibana Query Language) tìm kiếm log nhanh theo `traceId`.

---

## 3. Thiết kế Distributed Tracing (Trace ID) trong Spring Boot 3.2.5

Hệ thống sử dụng **Micrometer Tracing** (thay thế cho Spring Cloud Sleuth ở Spring Boot 2.x) kết hợp **OpenTelemetry (OTel)** để bám vết toàn bộ chuỗi cuộc gọi.

### Giải pháp 1: Sử dụng Micrometer Tracing & OpenTelemetry (Khuyên dùng)
Cách này tự động bám vết tất cả WebFlux (Gateway), Web MVC (Services), OpenFeign, và Kafka mà không cần viết nhiều code thủ công.

#### Bước 3.1: Cấu hình Parent [pom.xml](file:///d:/Microservices/P_BookLand_MS/pom.xml)
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

#### Bước 3.2: Thêm Dependency vào các Service cần Tracing
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

#### Bước 3.3: Cấu hình `application.yml` chung cho các Service
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
Nếu không muốn thêm các dependency quản lý giám sát, bạn có thể tự viết code Java để truyền Trace ID qua header `X-Correlation-Id`.

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
        log.info("Processing order notification...");
    } finally {
        MDC.remove("traceId");
    }
}
```

---

## 4. Định dạng Log dạng JSON bằng Logback

Để Filebeat dễ dàng gom log và parse các trường như `traceId`, `level`, `message` một cách chuẩn xác, log cần được xuất ra console dưới dạng JSON.

### Bước 4.1: Thêm thư viện Encoder JSON vào POM
Thêm dependency này vào parent [pom.xml](file:///d:/Microservices/P_BookLand_MS/pom.xml):

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
                <!-- Định dạng: Thời gian [TraceId] Level Thread Logger - Message -->
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

## 5. Tối ưu hóa & Giới hạn Logs thực sự cần thiết (Log Filtering)

Nếu ghi nhận tất cả mọi hoạt động của các thư viện bên thứ ba (Spring, Hibernate, Kafka, Apache client), hệ thống sẽ bị quá tải logs rác, tiêu tốn rất nhiều RAM/Disk của Elasticsearch và làm loãng logs nghiệp vụ thực tế. 

Dưới đây là kế hoạch cấu hình để chỉ thu thập những logs thực sự cần thiết:

### 5.1 Cấu hình Logging Levels tối ưu trong `application.yml`
Bằng việc cấu hình logging levels một cách chính xác cho từng môi trường (Production/Docker), chúng ta có thể loại bỏ tới **85% logs rác** từ các thư viện:

```yaml
logging:
  level:
    root: WARN                   # Mặc định chỉ log WARN và ERROR cho tất cả các thư viện
    com.bookland: INFO            # Chỉ ghi log nghiệp vụ thực tế của hệ thống chúng ta
    org.springframework: WARN     # Tắt log INFO verbose lúc khởi động hoặc quét class của Spring
    org.springframework.web: INFO # Giữ lại log của Controller/Routing APIs
    org.hibernate.SQL: WARN       # TẮT log SQL SELECT của Hibernate (Rất nhiều và gây nhiễu log trong Production)
    org.hibernate.type.descriptor.sql.BasicBinder: WARN # Tắt log binding parameter của Hibernate
    org.apache.kafka: WARN        # Tắt logs polling liên tục (heartbeat) của Kafka Consumer
    org.apache.zookeeper: WARN    # Tắt logs duy trì kết nối của Zookeeper
```
* **Lợi ích**: Tiết kiệm hàng chục GB dung lượng lưu trữ trên Elasticsearch, giảm tải CPU/RAM cho Filebeat khi không phải đọc và parse hàng triệu dòng log rác.

### 5.2 Loại bỏ logs Health Check của Kubernetes (Liveness/Readiness Probes)
Kubernetes liên tục gọi vào các endpoint như `/actuator/health`, `/actuator/liveness` của **API Gateway** và các Microservices cứ mỗi 2 - 5 giây/lần. Logs từ các luồng này có thể chiếm đến **70-80%** tổng lượng log của Gateway.

**Giải pháp lọc ở Filebeat Config:**
Cấu hình Filebeat để bỏ qua hoàn toàn các log dòng chứa chuỗi `/actuator/` hoặc `/health`:

```yaml
# Thêm cấu hình drop_event vào filebeat.yml hoặc filebeat ConfigMap
processors:
  - drop_event:
      when:
        or:
          - contains:
              message: "/actuator/health"
          - contains:
              message: "/actuator/liveness"
          - contains:
              message: "/actuator/readiness"
          - contains:
              message: "GET /actuator"
```
* **Lợi ích**: Kibana sẽ chỉ hiển thị các API nghiệp vụ thực tế được gọi từ người dùng, giúp lập trình viên tìm lỗi nhanh hơn mà không bị ngập trong log kiểm tra sức khỏe của Kubernetes.

### 5.3 Quy ước viết Log trong mã nguồn
Để logs có giá trị phục vụ debug, nhóm phát triển cần tuân thủ quy tắc:
* **Log Level ERROR**: Chỉ dùng khi xảy ra lỗi hệ thống (mất kết nối DB, API ngoài bị timeout, lỗi crash logic). **Bắt buộc** kèm theo `exception stacktrace`.
* **Log Level WARN**: Sử dụng khi nghiệp vụ không diễn ra như mong đợi nhưng không gây treo hệ thống (ví dụ: Sai mật khẩu, token hết hạn, input validation failed).
* **Log Level INFO**: Sử dụng để ghi nhận các điểm mốc nghiệp vụ (ví dụ: `User [id=123] created order [id=456]`, `Processing payment via VNPAY for order 789`).
* **Log Level DEBUG/TRACE**: Chỉ bật ở môi trường Local. Tuyệt đối không bật trong môi trường Production/K8s.

---

## 6. Triển khai EFK Stack trên Docker Compose

Bổ sung Kibana và Filebeat vào file [docker-compose.yml](file:///d:/Microservices/P_BookLand_MS/docker-compose.yml) để chạy thử nghiệm local:

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

  # Filebeat — Gom log từ Docker container và đẩy sang Elasticsearch
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
    # Giải mã định dạng JSON
    json.keys_under_root: true
    json.overwrite_keys: true
    json.add_error_key: true
    processors:
      - add_docker_metadata: ~
      # Bộ lọc loại bỏ logs health check rác
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

---

## 7. Triển khai EFK Stack trên Kubernetes (Minikube)

Khi triển khai trên Minikube theo hướng dẫn trong [trienkhai.md](file:///d:/Microservices/P_BookLand_MS/document-microservice/trienkhai_kubenetes/trienkhai.md), chúng ta sẽ tận dụng Pod `elasticsearch-0` trong namespace `bookland` và triển khai thêm Kibana (Deployment) cùng Filebeat (DaemonSet).

*Chi tiết các bước cài đặt và tệp cấu hình YAML của Kubernetes (Manifests) được mô tả trong tài liệu quy trình triển khai: [trienkhai_logging.md](file:///d:/Microservices/P_BookLand_MS/document-microservice/advance_feature/centralized_logging/trienkhai_logging.md).*
