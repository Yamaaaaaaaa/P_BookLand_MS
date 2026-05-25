package com.bookland.event.client;

import com.bookland.event.dto.response.ApiResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "user-service", url = "${services.user-service.url:http://localhost:8082}")
public interface UserClient {

    @GetMapping("/internal/users/{userId}")
    ApiResponse<Object> getProfile(@PathVariable("userId") String userId);
}
