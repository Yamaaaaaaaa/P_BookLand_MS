# Stage 1: Build stage
FROM maven:3.8.8-eclipse-temurin-17-alpine AS build
WORKDIR /build/services/api-gateway
COPY pom.xml /build/pom.xml
COPY services/api-gateway/pom.xml .
COPY services/api-gateway/src ./src
RUN mvn clean package -DskipTests

# Stage 2: Run stage
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /build/services/api-gateway/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
