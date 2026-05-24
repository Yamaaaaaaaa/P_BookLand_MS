package com.bookland.user.controller;

import com.bookland.user.dto.request.UpdateProfileRequest;
import com.bookland.user.dto.response.ApiResponse;
import com.bookland.user.dto.response.UserProfileResponse;
import com.bookland.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import org.springframework.web.bind.annotation.RequestHeader;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/{userId}")
    public ApiResponse<UserProfileResponse> getUser(@PathVariable String userId) {
        return ApiResponse.<UserProfileResponse>builder()
                .result(userService.getProfile(userId))
                .build();
    }

    @GetMapping
    public ApiResponse<List<UserProfileResponse>> getAllUser() {
        return ApiResponse.<List<UserProfileResponse>>builder()
                .result(userService.getAllProfiles())
                .build();
    }

    @GetMapping("/my-profile")
    public ApiResponse<UserProfileResponse> getMyProfile(
            @RequestHeader(value = "X-User-Email", required = false) String userEmail) {
        return ApiResponse.<UserProfileResponse>builder()
                .result(userService.getMyProfile(userEmail))
                .build();
    }

    @PutMapping("/my-profile")
    public ApiResponse<UserProfileResponse> updateMyProfile(
            @RequestHeader(value = "X-User-Email", required = false) String userEmail,
            @RequestBody UpdateProfileRequest request) {
        return ApiResponse.<UserProfileResponse>builder()
                .result(userService.updateMyProfile(userEmail, request))
                .build();
    }
}
