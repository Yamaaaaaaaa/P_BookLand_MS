FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY services/user-service/target/*.jar app.jar
EXPOSE 8082
ENTRYPOINT ["java", "-jar", "app.jar"]
