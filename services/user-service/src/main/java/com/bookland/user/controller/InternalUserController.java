package com.bookland.user.controller;

import org.springframework.web.bind.annotation.*;
import com.bookland.user.dto.response.ApiResponse;
import com.bookland.user.dto.request.ProfileCreationRequest;
import com.bookland.user.dto.request.UpdateProfileRequest;
import com.bookland.user.dto.response.UserProfileResponse;
import com.bookland.user.service.UserService;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class InternalUserController {

    private final UserService userService;

    /**
     * POST /internal/users
     * Được gọi bởi identity-service sau khi đăng ký/đăng nhập Google.
     * userId trong request là Long id từ identity-service.
     */
    @PostMapping("/internal/users")
    public ApiResponse<UserProfileResponse> createProfile(@RequestBody ProfileCreationRequest request) {
        return ApiResponse.<UserProfileResponse>builder()
                .result(userService.createProfile(request))
                .build();
    }

    /**
     * GET /internal/users/{userId}
     * Tra cứu profile theo Long id (dùng bởi book-service, order-service).
     */
    @GetMapping("/internal/users/{userId}")
    public ApiResponse<UserProfileResponse> getProfile(@PathVariable Long userId) {
        return ApiResponse.<UserProfileResponse>builder()
                .result(userService.getUserById(userId))
                .build();
    }

    /**
     * PUT /internal/users/{userId}
     * Cập nhật profile theo Long id (dùng bởi identity-service).
     */
    @PutMapping("/internal/users/{userId}")
    public ApiResponse<UserProfileResponse> updateProfile(
            @PathVariable Long userId,
            @RequestBody UpdateProfileRequest request) {
        return ApiResponse.<UserProfileResponse>builder()
                .result(userService.updateProfileById(userId, request))
                .build();
    }
}
