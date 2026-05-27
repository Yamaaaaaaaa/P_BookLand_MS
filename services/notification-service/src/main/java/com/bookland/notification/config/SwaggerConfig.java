package com.bookland.notification.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class SwaggerConfig {

    @Value("${app.openapi.dev-url:http://api.bookland.local}")
    private String devUrl;

    @Value("${app.openapi.prod-url:https://api.p-bookland.io.vn}")
    private String prodUrl;

    @Bean
    public OpenAPI openAPI() {
        final String securitySchemeName = "BearerAuth";
        return new OpenAPI()
                .info(new Info()
                        .title("Notification Service API")
                        .description("API cho Notification Service (Notification và Email) — BookLand Microservices")
                        .version("1.0.0"))
                .servers(List.of(
                        new Server().url(devUrl).description("Development Server (Gateway)"),
                        new Server().url(prodUrl).description("Production Server (Gateway)"),
                        new Server().url("/").description("Relative Server Route (Auto-detect)")))
                .addSecurityItem(new SecurityRequirement().addList(securitySchemeName))
                .components(new Components()
                        .addSecuritySchemes(securitySchemeName,
                                new SecurityScheme()
                                        .name(securitySchemeName)
                                        .type(SecurityScheme.Type.HTTP)
                                        .scheme("bearer")
                                        .bearerFormat("JWT")));
    }
}
