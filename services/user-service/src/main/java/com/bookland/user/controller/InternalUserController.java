package com.bookland.user.controller;

import org.springframework.web.bind.annotation.*;
import com.bookland.user.dto.response.ApiResponse;
import com.bookland.user.dto.request.ProfileCreationRequest;
import com.bookland.user.dto.response.UserProfileResponse;
import com.bookland.user.service.UserService;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class InternalUserController {
    private final UserService userService;

    @PostMapping("/internal/users")
    public ApiResponse<UserProfileResponse> createProfile(@RequestBody ProfileCreationRequest request) {
        return ApiResponse.<UserProfileResponse>builder()
                .result(userService.createProfile(request))
                .build();
    }

    @GetMapping("/internal/users/{userId}")
    public ApiResponse<UserProfileResponse> getProfile(@PathVariable String userId) {
        return ApiResponse.<UserProfileResponse>builder()
                .result(userService.getByUserId(userId))
                .build();
    }

    @PutMapping("/internal/users/{userId}")
    public ApiResponse<UserProfileResponse> updateProfile(@PathVariable String userId, @RequestBody com.bookland.user.dto.request.UpdateProfileRequest request) {
        return ApiResponse.<UserProfileResponse>builder()
                .result(userService.updateProfileByUserId(userId, request))
                .build();
    }

    @PutMapping("/internal/users/update-id")
    public ApiResponse<UserProfileResponse> updateUserIdByEmail(
            @RequestParam String email,
            @RequestParam String newUserId) {
        return ApiResponse.<UserProfileResponse>builder()
                .result(userService.updateUserIdByEmail(email, newUserId))
                .build();
    }
}
