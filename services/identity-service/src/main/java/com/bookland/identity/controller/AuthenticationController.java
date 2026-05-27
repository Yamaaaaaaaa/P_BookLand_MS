package com.bookland.identity.controller;

import com.bookland.identity.dto.request.*;
import com.bookland.identity.dto.request.ApiResponse;
import com.bookland.identity.dto.response.AuthenticationResponse;
import com.bookland.identity.dto.response.IntrospectResponse;
import com.bookland.identity.dto.response.LoginResponse;
import com.bookland.identity.dto.response.UserResponse;
import com.bookland.identity.service.AuthenticationService;
import com.nimbusds.jose.JOSEException;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.*;

import java.text.ParseException;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@SecurityRequirement(name = "BearerAuth")
public class AuthenticationController {
    AuthenticationService authenticationService;

    // API Lấy Token mới bằng RefreshToken
    @PostMapping("/refresh")
    public ApiResponse<AuthenticationResponse> getNewAccessTokenByRefreshToken(@RequestBody RefreshRequest refreshRequest) throws ParseException, JOSEException {
        var result = authenticationService.getTokenByRefresh(refreshRequest);
        return ApiResponse.<AuthenticationResponse>builder().result(result).build();
    }

    @PostMapping("/login")
    public ApiResponse<LoginResponse> login(@RequestBody LoginRequest request) throws JOSEException, ParseException {
        var result = authenticationService.login(request);
        return ApiResponse.<LoginResponse>builder().result(result).build();
    }

    @PostMapping("/admin/login")
    public ApiResponse<LoginResponse> adminlogin(@RequestBody LoginRequest request) throws JOSEException, ParseException {
        var result = authenticationService.adminlogin(request);
        return ApiResponse.<LoginResponse>builder().result(result).build();
    }

    @PostMapping("/register")
    public ApiResponse<UserResponse> register(@RequestBody RegisterRequest request) throws JOSEException, ParseException {
        var result = authenticationService.register(request);
        return ApiResponse.<UserResponse>builder().result(result).build();
    }

    @PostMapping("/logout")
    public ApiResponse<Void> logout(@RequestBody LogoutRequest logoutRequest) throws JOSEException, ParseException{
        authenticationService.logout(logoutRequest);
        return ApiResponse.<Void>builder().build();
    }

    // Forgot Password: Chờ ng dùng phải tạo nguyên một cái giao diện để đổi MK cơ

    // Dev: API kiểm tra token hợp lệ
    @PostMapping("/introspect")
    public ApiResponse<IntrospectResponse> introspect(@RequestBody IntrospectRequest request) throws JOSEException, ParseException {
        var result = authenticationService.introspect(request);
        return ApiResponse.<IntrospectResponse>builder().result(result).build();
    }

    // Dev: API lấy RefreshToken
    @PostMapping("/test-refresh")
    public ApiResponse<AuthenticationResponse> refresh(@RequestBody RefreshRequest refreshRequest)  throws JOSEException, ParseException{
        var result = authenticationService.refreshToken(refreshRequest);
        return ApiResponse.<AuthenticationResponse>builder().result(result).build();
    }

    // Đăng nhập bằng Google (FE gửi id_token từ Google Sign-In)
    @PostMapping("/google")
    public ApiResponse<LoginResponse> loginWithGoogle(@RequestBody GoogleLoginRequest request) {
        var result = authenticationService.loginWithGoogle(request);
        return ApiResponse.<LoginResponse>builder().result(result).build();
    }

}
