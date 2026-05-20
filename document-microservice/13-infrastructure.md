# 13 — Hạ tầng (Infrastructure)

> Docker Compose, Kafka, Monitoring và CI/CD cho hệ thống BookLand Microservice.

---

## 1. Docker Compose — Development Environment

```yaml
# docker-compose.yml (Microservice version)
version: '3.8'

services:
  # ================================================
  # INFRASTRUCTURE SERVICES
  # ================================================

  # MySQL — Identity Service DB
  identity-db:
    image: mysql:8.0
    container_name: identity-db
    environment:
      MYSQL_DATABASE: identity_db
      MYSQL_ROOT_PASSWORD: root
    ports:
      - "3307:3306"
    volumes:
      - identity_data:/var/lib/mysql

  # MySQL — User Service DB
  user-db:
    image: mysql:8.0
    container_name: user-db
    environment:
      MYSQL_DATABASE: user_db
      MYSQL_ROOT_PASSWORD: root
    ports:
      - "3308:3306"
    volumes:
      - user_data:/var/lib/mysql

  # MySQL — Book Service DB
  book-db:
    image: mysql:8.0
    container_name: book-db
    environment:
      MYSQL_DATABASE: book_db
      MYSQL_ROOT_PASSWORD: root
    ports:
      - "3309:3306"
    volumes:
      - book_data:/var/lib/mysql

  # MySQL — Order Service DB
  order-db:
    image: mysql:8.0
    container_name: order-db
    environment:
      MYSQL_DATABASE: order_db
      MYSQL_ROOT_PASSWORD: root
    ports:
      - "3310:3306"
    volumes:
      - order_data:/var/lib/mysql

  # MySQL — Event Service DB
  event-db:
    image: mysql:8.0
    container_name: event-db
    environment:
      MYSQL_DATABASE: event_db
      MYSQL_ROOT_PASSWORD: root
    ports:
      - "3311:3306"
    volumes:
      - event_data:/var/lib/mysql

  # MongoDB — Notification Service DB
  notification-db:
    image: mongo:7.0
    container_name: notification-db
    environment:
      MONGO_INITDB_ROOT_USERNAME: root
      MONGO_INITDB_ROOT_PASSWORD: root
      MONGO_INITDB_DATABASE: notification_db
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

  # Redis — Shared cache
  redis:
    image: redis:7-alpine
    container_name: bookland-redis
    ports:
      - "6379:6379"
    command: redis-server --requirepass bookland123

  # Zookeeper (Kafka dependency)
  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    container_name: zookeeper
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000

  # Kafka
  kafka:
    image: confluentinc/cp-kafka:7.5.0
    container_name: bookland-kafka
    depends_on: [zookeeper]
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:29092,PLAINTEXT_HOST://localhost:9092
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,PLAINTEXT_HOST:PLAINTEXT
      KAFKA_INTER_BROKER_LISTENER_NAME: PLAINTEXT
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_AUTO_CREATE_TOPICS_ENABLE: true

  # Kafka UI (Debug)
  kafka-ui:
    image: provectuslabs/kafka-ui:latest
    container_name: kafka-ui
    ports:
      - "8090:8080"
    environment:
      KAFKA_CLUSTERS_0_NAME: local
      KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS: kafka:29092

  # Elasticsearch
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    container_name: bookland-elasticsearch
    environment:
      - discovery.type=single-node
      - ES_JAVA_OPTS=-Xms512m -Xmx512m
      - xpack.security.enabled=false
    ports:
      - "9200:9200"
    volumes:
      - es_data:/usr/share/elasticsearch/data

  # MinIO (File Storage — self-hosted S3)
  minio:
    image: minio/minio:latest
    container_name: bookland-minio
    ports:
      - "9000:9000"
      - "9001:9001"   # MinIO Console
    environment:
      MINIO_ROOT_USER: bookland
      MINIO_ROOT_PASSWORD: bookland123
    command: server /data --console-address ":9001"
    volumes:
      - minio_data:/data

  # ================================================
  # APPLICATION SERVICES
  # ================================================

  api-gateway:
    build: ./services/api-gateway
    container_name: api-gateway
    ports:
      - "8080:8080"
    depends_on:
      - redis
    environment:
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - REDIS_PASSWORD=bookland123

  identity-service:
    build: ./services/identity-service
    container_name: identity-service
    ports:
      - "8081:8081"
    depends_on:
      - identity-db
      - redis
      - kafka
    environment:
      - DB_URL=jdbc:mysql://identity-db:3306/identity_db
      - REDIS_HOST=redis
      - KAFKA_BOOTSTRAP_SERVERS=kafka:29092

  user-service:
    build: ./services/user-service
    container_name: user-service
    ports:
      - "8082:8082"
    depends_on:
      - user-db
    environment:
      - DB_URL=jdbc:mysql://user-db:3306/user_db

  book-service:
    build: ./services/book-service
    container_name: book-service
    ports:
      - "8083:8083"
    depends_on:
      - book-db
      - kafka
    environment:
      - DB_URL=jdbc:mysql://book-db:3306/book_db
      - KAFKA_BOOTSTRAP_SERVERS=kafka:29092

  order-service:
    build: ./services/order-service
    container_name: order-service
    ports:
      - "8084:8084"
    depends_on:
      - order-db
      - kafka
    environment:
      - DB_URL=jdbc:mysql://order-db:3306/order_db
      - KAFKA_BOOTSTRAP_SERVERS=kafka:29092

  event-service:
    build: ./services/event-service
    container_name: event-service
    ports:
      - "8085:8085"
    depends_on:
      - event-db
    environment:
      - DB_URL=jdbc:mysql://event-db:3306/event_db

  notification-service:
    build: ./services/notification-service
    container_name: notification-service
    ports:
      - "8086:8086"
    depends_on:
      - notification-db
      - kafka
      - redis
    environment:
      - MONGO_URI=mongodb://root:root@notification-db:27017/notification_db?authSource=admin
      - KAFKA_BOOTSTRAP_SERVERS=kafka:29092
      - REDIS_HOST=redis

  file-service:
    build: ./services/file-service
    container_name: file-service
    ports:
      - "8087:8087"
    depends_on:
      - minio
    environment:
      - MINIO_URL=http://minio:9000
      - MINIO_ACCESS_KEY=bookland
      - MINIO_SECRET_KEY=bookland123

  search-service:
    build: ./services/search-service
    container_name: search-service
    ports:
      - "8088:8088"
    depends_on:
      - elasticsearch
      - kafka
    environment:
      - ELASTICSEARCH_URIS=http://elasticsearch:9200
      - KAFKA_BOOTSTRAP_SERVERS=kafka:29092

  # Frontend
  bookland-fe:
    build: ./BookLand_FE
    container_name: bookland-fe
    ports:
      - "5173:80"
    depends_on:
      - api-gateway

volumes:
  identity_data:
  user_data:
  book_data:
  order_data:
  event_data:
  mongo_data:
  minio_data:
  es_data:
```

---

## 2. Cấu trúc thư mục dự án Microservice

```
PTIT_BookLand_Microservice/
├── docker-compose.yml
├── docker-compose.prod.yml
├── .env
│
├── services/
│   ├── api-gateway/              ← Spring Cloud Gateway
│   ├── identity-service/         ← Auth & Identity
│   ├── user-service/             ← User Profile
│   ├── book-service/             ← Books Catalog
│   ├── order-service/            ← Orders & Cart
│   ├── event-service/            ← Promotions
│   ├── notification-service/     ← Email & Push
│   ├── file-service/             ← File Upload
│   └── search-service/           ← Elasticsearch
│
├── BookLand_FE/                  ← React Frontend (không đổi)
└── document-microservice/        ← Tài liệu này
```

---

## 3. Cấu trúc mỗi Service

```
identity-service/
├── Dockerfile
├── build.gradle
├── src/main/java/com/bookland/identity/
│   ├── IdentityServiceApplication.java
│   ├── config/
│   ├── controller/
│   ├── service/
│   ├── repository/
│   ├── entity/
│   ├── dto/
│   ├── event/              ← Kafka event classes
│   ├── exception/
│   └── mapper/
└── src/main/resources/
    └── application.yml
```

---

## 4. Monitoring Stack

### 4.1 Prometheus + Grafana

```yaml
# Thêm vào docker-compose.yml
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    ports:
      - "3000:3000"
    environment:
      GF_SECURITY_ADMIN_PASSWORD: bookland123
    volumes:
      - grafana_data:/var/lib/grafana
```

```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'api-gateway'
    static_configs:
      - targets: ['api-gateway:8080']
    metrics_path: '/actuator/prometheus'

  - job_name: 'identity-service'
    static_configs:
      - targets: ['identity-service:8081']
    metrics_path: '/actuator/prometheus'

  # ... repeat for each service
```

### 4.2 Distributed Tracing (Zipkin)

```yaml
# Thêm vào docker-compose.yml
  zipkin:
    image: openzipkin/zipkin:latest
    container_name: zipkin
    ports:
      - "9411:9411"
```

```yaml
# application.yml (mỗi service)
management:
  tracing:
    sampling:
      probability: 1.0   # 100% request được trace (dev)
  zipkin:
    tracing:
      endpoint: http://zipkin:9411/api/v2/spans
```

---

## 5. Ports Summary

| Service | Port | Admin UI |
|---|---|---|
| **API Gateway** | 8080 | — |
| **Identity Service** | 8081 | — |
| **User Service** | 8082 | — |
| **Book Service** | 8083 | — |
| **Order Service** | 8084 | — |
| **Event Service** | 8085 | — |
| **Notification Service** | 8086 | — |
| **File Service** | 8087 | — |
| **Search Service** | 8088 | — |
| **Frontend** | 5173 | — |
| **Kafka UI** | 8090 | http://localhost:8090 |
| **MinIO Console** | 9001 | http://localhost:9001 |
| **Grafana** | 3000 | http://localhost:3000 |
| **Zipkin** | 9411 | http://localhost:9411 |
| **Elasticsearch** | 9200 | — |
| **MySQL (Identity)** | 3307 | — |
| **MySQL (User)** | 3308 | — |
| **MySQL (Book)** | 3309 | — |
| **MySQL (Order)** | 3310 | — |
| **MySQL (Event)** | 3311 | — |
| **MongoDB** | 27017 | — |
| **Redis** | 6379 | — |

---

## 6. CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
name: Build & Deploy

on:
  push:
    branches: [main]
    paths:
      - 'services/book-service/**'  # Chỉ build service bị thay đổi

jobs:
  build-book-service:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Set up JDK 17
        uses: actions/setup-java@v3
        with:
          java-version: '17'
          distribution: 'temurin'

      - name: Build with Gradle
        working-directory: services/book-service
        run: ./gradlew build -x test

      - name: Build Docker image
        run: |
          docker build -t bookland/book-service:${{ github.sha }} \
            services/book-service/

      - name: Push to Registry
        run: |
          docker push bookland/book-service:${{ github.sha }}

      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SERVER_SSH_KEY }}
          script: |
            docker pull bookland/book-service:${{ github.sha }}
            docker stop book-service || true
            docker run -d --name book-service \
              bookland/book-service:${{ github.sha }}
```

---

*← [12 - Giao tiếp](./12-communication.md) | [14 - Lộ trình →](./14-migration-roadmap.md)*
