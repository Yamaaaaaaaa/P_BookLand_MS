package com.bookland.user.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class SwaggerConfig {

    @Value("${app.openapi.dev-url:http://localhost:8080}")
    private String devUrl;

    @Value("${app.openapi.prod-url:http://3.107.238.92:8080}")
    private String prodUrl;

    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Bookland User Service API")
                        .version("1.0.0")
                        .description("API Documentation for Bookland User Management Service")
                        .contact(new Contact()
                                .name("Bookland Team")
                                .email("support@bookland.com")
                                .url("https://bookland.com"))
                        .license(new License()
                                .name("Apache 2.0")
                                .url("https://www.apache.org/licenses/LICENSE-2.0.html")))
                .servers(List.of(
                        new Server().url(devUrl).description("Development Server (Gateway)"),
                        new Server().url(prodUrl).description("Production Server (Gateway)"),
                        new Server().url("/").description("Relative Server Route (Auto-detect)")));
    }
}
