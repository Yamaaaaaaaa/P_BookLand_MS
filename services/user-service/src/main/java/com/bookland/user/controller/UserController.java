package com.bookland.user.controller;

import com.bookland.user.dto.request.UpdateProfileRequest;
import com.bookland.user.dto.response.ApiResponse;
import com.bookland.user.dto.response.UserProfileResponse;
import com.bookland.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    /**
     * GET /users/{id}
     * Lấy profile theo Long id (identity-service PK).
     */
    @GetMapping("/{id}")
    public ApiResponse<UserProfileResponse> getUser(@PathVariable Long id) {
        return ApiResponse.<UserProfileResponse>builder()
                .result(userService.getUserById(id))
                .build();
    }

    @GetMapping
    public ApiResponse<List<UserProfileResponse>> getAllUser() {
        return ApiResponse.<List<UserProfileResponse>>builder()
                .result(userService.getAllProfiles())
                .build();
    }

    /**
     * GET /users/my-profile
     * Lấy profile của user hiện tại dựa trên X-User-Email từ gateway.
     */
    @GetMapping("/my-profile")
    public ApiResponse<UserProfileResponse> getMyProfile(
            @RequestHeader(value = "X-User-Email", required = false) String userEmail) {
        return ApiResponse.<UserProfileResponse>builder()
                .result(userService.getMyProfile(userEmail))
                .build();
    }

    /**
     * PUT /users/my-profile
     * Cập nhật profile của user hiện tại.
     */
    @PutMapping("/my-profile")
    public ApiResponse<UserProfileResponse> updateMyProfile(
            @RequestHeader(value = "X-User-Email", required = false) String userEmail,
            @RequestBody UpdateProfileRequest request) {
        return ApiResponse.<UserProfileResponse>builder()
                .result(userService.updateMyProfile(userEmail, request))
                .build();
    }
}
