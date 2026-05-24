# Stage 1: Build stage
FROM maven:3.8.8-eclipse-temurin-17-alpine AS build
WORKDIR /build/services/order-service
COPY pom.xml /build/pom.xml
COPY services/order-service/pom.xml .
COPY services/order-service/src ./src
RUN mvn clean package -DskipTests

# Stage 2: Run stage
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /build/services/order-service/target/*.jar app.jar
EXPOSE 8084
ENTRYPOINT ["java", "-jar", "app.jar"]
