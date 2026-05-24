# Stage 1: Build stage
FROM maven:3.8.8-eclipse-temurin-17-alpine AS build
WORKDIR /build/services/notification-service
COPY pom.xml /build/pom.xml
COPY services/notification-service/pom.xml .
COPY services/notification-service/src ./src
RUN mvn clean package -DskipTests

# Stage 2: Run stage
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /build/services/notification-service/target/*.jar app.jar
EXPOSE 8086
ENTRYPOINT ["java", "-jar", "app.jar"]
