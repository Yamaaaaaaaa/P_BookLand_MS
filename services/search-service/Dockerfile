FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY services/search-service/target/*.jar app.jar
EXPOSE 8088
ENTRYPOINT ["java", "-jar", "app.jar"]
