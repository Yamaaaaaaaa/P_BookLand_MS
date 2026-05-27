FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY services/file-service/target/*.jar app.jar
EXPOSE 8087
ENTRYPOINT ["java", "-jar", "app.jar"]
