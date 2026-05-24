# Stage 1: Build stage
FROM maven:3.8.8-eclipse-temurin-17-alpine AS build
WORKDIR /build/services/book-service
COPY pom.xml /build/pom.xml
COPY services/book-service/pom.xml .
COPY services/book-service/src ./src
RUN mvn clean package -DskipTests

# Stage 2: Run stage
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /build/services/book-service/target/*.jar app.jar
EXPOSE 8083
ENTRYPOINT ["java", "-jar", "app.jar"]
