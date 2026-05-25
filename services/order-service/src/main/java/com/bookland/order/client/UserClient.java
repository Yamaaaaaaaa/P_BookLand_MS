package com.bookland.order.client;

import com.bookland.order.dto.response.ApiResponse;
import com.bookland.order.dto.response.UserProfileResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "user-service", url = "${services.user-service.url:http://localhost:8082}")
public interface UserClient {

    @GetMapping("/internal/users/{userId}")
    ApiResponse<UserProfileResponse> getProfile(@PathVariable("userId") String userId);

    @GetMapping("/users/my-profile")
    ApiResponse<UserProfileResponse> getMyProfile(@org.springframework.web.bind.annotation.RequestHeader("X-User-Email") String email);
}
