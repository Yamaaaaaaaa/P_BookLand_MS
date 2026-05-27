package com.bookland.order.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

/**
 * SecurityConfig cho order-service.
 * Authentication & Authorization được xử lý bởi api-gateway.
 * Service này chỉ cần permitAll() nhưng vẫn có Security để hỗ trợ CORS.
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {


    private static final String[] PUBLIC_PATHS = {
            "/api/payment-methods/**",
            "/api/shipping-methods/**",
            "/api/orders/**",
            "/api/bills/**",
            "/v3/api-docs/**",
            "/swagger-ui/**",
            "/swagger-ui.html",
            "/actuator/**"
    };

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(AbstractHttpConfigurer::disable)
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(PUBLIC_PATHS).permitAll()
                        .anyRequest().permitAll()
                );
        return http.build();
    }
}
