FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY services/notification-service/target/*.jar app.jar
EXPOSE 8086
ENTRYPOINT ["java", "-jar", "app.jar"]
