package com.bookland.chat.client;

import com.bookland.chat.dto.response.ApiResponse;
import com.bookland.chat.dto.response.UserProfileResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;

@FeignClient(name = "user-service", url = "${services.user-service.url}")
public interface UserClient {

    @GetMapping("/internal/users/{userId}")
    ApiResponse<UserProfileResponse> getProfile(@PathVariable("userId") Long userId);

    @GetMapping("/internal/users/by-email")
    ApiResponse<UserProfileResponse> getProfileByEmail(@RequestParam("email") String email);
}
