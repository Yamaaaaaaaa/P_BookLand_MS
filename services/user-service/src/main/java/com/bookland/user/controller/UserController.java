package com.bookland.user.controller;

import com.bookland.user.dto.request.UpdateRolesRequest;
import com.bookland.user.dto.request.UserRequest;
import com.bookland.user.dto.request.UserUpdateRequest;
import com.bookland.user.dto.response.ApiResponse;
import com.bookland.user.dto.response.UserResponse;
import com.bookland.user.entity.User.UserStatus;
import com.bookland.user.service.UserService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

/**
 * UserController - xử lý các API liên quan đến quản lý người dùng.
 *
 * Base path: /api/users
 */
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Slf4j
@SecurityRequirement(name = "BearerAuth")
public class UserController {

    private final UserService userService;

    // ===========================
    // Hello / Health check
    // ===========================

    @GetMapping("/hello")
    public ApiResponse<String> hello() {
        return ApiResponse.<String>builder()
                .result("User Service is running!")
                .build();
    }

    // ===========================
    // GET - Queries
    // ===========================

    @GetMapping
    @PreAuthorize("hasAnyRole('ROLE_ADMIN','ROLE_MANAGER')")
    public ApiResponse<Page<UserResponse>> getAllUsers(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) UserStatus status,
            @RequestParam(required = false) Long roleId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDirection
    ) {
        Sort.Direction direction = sortDirection.equalsIgnoreCase("ASC")
                ? Sort.Direction.ASC
                : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));

        Page<UserResponse> users = userService.getAllUsers(keyword, status, roleId, pageable);
        return ApiResponse.<Page<UserResponse>>builder().result(users).build();
    }

    /**
     * Get own profile - Lấy thông tin profile của chính mình
     * Email được lấy linh hoạt từ header X-User-Email (Gateway) hoặc SecurityContextHolder (Local context).
     */
    @GetMapping("/me")
    public ApiResponse<UserResponse> getOwnProfile(
            @RequestHeader(value = "X-User-Email", required = false) String headerEmail
    ) {
        String email = headerEmail;
        if (email == null || email.isBlank()) {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication != null) {
                email = authentication.getName();
            }
        }

        if (email == null || email.isBlank() || "anonymousUser".equalsIgnoreCase(email)) {
            return ApiResponse.<UserResponse>builder()
                    .code(1006)
                    .message("Unauthenticated")
                    .build();
        }

        UserResponse user = userService.getUserByEmail(email);
        return ApiResponse.<UserResponse>builder().result(user).build();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ROLE_ADMIN', 'ROLE_MANAGER')")
    public ApiResponse<UserResponse> getUserById(@PathVariable Long id) {
        UserResponse user = userService.getUserById(id);
        return ApiResponse.<UserResponse>builder().result(user).build();
    }

    // ===========================
    // POST - Create
    // ===========================

    @PostMapping
    @PreAuthorize("hasAnyRole('ROLE_ADMIN', 'ROLE_MANAGER')")
    public ApiResponse<UserResponse> createUser(@Valid @RequestBody UserRequest request) {
        UserResponse createdUser = userService.createUser(request);
        return ApiResponse.<UserResponse>builder().result(createdUser).build();
    }

    // ===========================
    // PUT - Update
    // ===========================

    @PutMapping("/{id}")
    public ApiResponse<UserResponse> updateUser(
            @PathVariable Long id,
            @Valid @RequestBody UserUpdateRequest request
    ) {
        UserResponse updatedUser = userService.updateUser(id, request);
        return ApiResponse.<UserResponse>builder().result(updatedUser).build();
    }

    @PutMapping("/{id}/roles")
    @PreAuthorize("hasAnyRole('ROLE_ADMIN', 'ROLE_MANAGER')")
    public ApiResponse<UserResponse> updateUserRoles(
            @PathVariable Long id,
            @Valid @RequestBody UpdateRolesRequest request
    ) {
        UserResponse updatedUser = userService.updateUserRoles(id, request);
        return ApiResponse.<UserResponse>builder().result(updatedUser).build();
    }

    // ===========================
    // PATCH - Partial Update
    // ===========================

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ROLE_ADMIN', 'ROLE_MANAGER')")
    public ApiResponse<UserResponse> updateUserStatus(
            @PathVariable Long id,
            @RequestParam UserStatus status
    ) {
        UserResponse updatedUser = userService.updateUserStatus(id, status);
        return ApiResponse.<UserResponse>builder().result(updatedUser).build();
    }

    // ===========================
    // DELETE
    // ===========================

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ROLE_ADMIN')")
    public ApiResponse<Void> deleteUser(@PathVariable Long id) {
        userService.deleteUser(id);
        return ApiResponse.<Void>builder().build();
    }
}
