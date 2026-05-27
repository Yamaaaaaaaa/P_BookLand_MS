package com.bookland.chat.config;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.lang.NonNull;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import java.util.ArrayList;
import java.util.Base64;

@Configuration
@EnableWebSocketMessageBroker
@Slf4j
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final ObjectMapper objectMapper;

    @Override
    public void configureMessageBroker(@NonNull MessageBrokerRegistry config) {
        // /topic: broadcast (publish-subscribe)
        // /queue: direct user messages (point-to-point)
        config.enableSimpleBroker("/topic", "/queue");
        // prefix for messages sent from client to server
        config.setApplicationDestinationPrefixes("/app");
        // prefix for private user routing
        config.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(@NonNull StompEndpointRegistry registry) {
        // Endpoint riêng cho Chat: /chat-ws (tách biệt với /ws của notification-service)
        registry.addEndpoint("/chat-ws")
                .setAllowedOriginPatterns("*")
                .withSockJS();
    }

    @Override
    public void configureClientInboundChannel(@NonNull ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(@NonNull Message<?> message, @NonNull MessageChannel channel) {
                StompHeaderAccessor accessor =
                        MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

                if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
                    String authHeader = accessor.getFirstNativeHeader("Authorization");
                    if (authHeader != null && authHeader.startsWith("Bearer ")) {
                        String token = authHeader.substring(7);
                        try {
                            String email = getEmailFromToken(token);
                            if (email != null && !email.isEmpty()) {
                                Authentication authentication =
                                        new UsernamePasswordAuthenticationToken(email, null, new ArrayList<>());
                                accessor.setUser(authentication);
                                log.info("Chat WebSocket user session authenticated: {}", email);
                            }
                        } catch (Exception e) {
                            log.error("Failed to parse JWT token in Chat WebSocket channel interceptor", e);
                        }
                    }
                }
                return message;
            }
        });
    }

    private String getEmailFromToken(String token) {
        try {
            String[] parts = token.split("\\.");
            if (parts.length >= 2) {
                String payload = new String(Base64.getUrlDecoder().decode(parts[1]));
                JsonNode jwtPayload = objectMapper.readTree(payload);
                return jwtPayload.has("sub") ? jwtPayload.get("sub").asText() : null;
            }
        } catch (Exception e) {
            log.error("Error decoding JWT payload in Chat WebSocket", e);
        }
        return null;
    }
}
