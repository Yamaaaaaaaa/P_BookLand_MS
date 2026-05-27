package com.bookland.notification.client;

import com.bookland.notification.dto.ApiResponse;
import com.bookland.notification.dto.response.UserProfileResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.List;

@FeignClient(name = "user-service", url = "${USER_SERVICE_HOST:http://localhost}:8082")
public interface UserClient {

    @GetMapping("/internal/users/{userId}")
    ApiResponse<UserProfileResponse> getProfile(@PathVariable("userId") String userId);

    @GetMapping("/users")
    ApiResponse<List<UserProfileResponse>> getAllUsers();
}
