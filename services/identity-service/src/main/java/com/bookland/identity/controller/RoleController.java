package com.bookland.identity.controller;

import com.bookland.identity.dto.request.RoleRequest;
import com.bookland.identity.dto.request.ApiResponse;
import com.bookland.identity.dto.response.RoleResponse;
import com.bookland.identity.service.RoleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/roles")
@RequiredArgsConstructor
@SecurityRequirement(name = "BearerAuth")
@Tag(name = "Role", description = "API quản lý vai trò người dùng")
@PreAuthorize("hasRole('ROLE_ADMIN')")
public class RoleController {

    private final RoleService roleService;

    @GetMapping
    @Operation(summary = "Lấy danh sách vai trò", description = "Lấy toàn bộ danh sách vai trò người dùng")
    public ApiResponse<List<RoleResponse>> getAllRoles() {
        return ApiResponse.<List<RoleResponse>>builder()
                .result(roleService.getAllRoles())
                .build();
    }


    @GetMapping("/{name}")
    @Operation(summary = "Lấy chi tiết vai trò", description = "Lấy thông tin chi tiết của một vai trò theo tên")
    public ApiResponse<RoleResponse> getRoleByName(@PathVariable String name) {
        return ApiResponse.<RoleResponse>builder()
                .result(roleService.getRoleByName(name))
                .build();
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ROLE_ADMIN', 'ROLE_MANAGER')")
    @Operation(summary = "Tạo vai trò mới", description = "Tạo một vai trò người dùng mới")
    public ApiResponse<RoleResponse> createRole(@Valid @RequestBody RoleRequest request) {
        return ApiResponse.<RoleResponse>builder()
                .result(roleService.createRole(request))
                .build();
    }

    @DeleteMapping("/{name}")
    @PreAuthorize("hasAnyRole('ROLE_ADMIN', 'ROLE_MANAGER')")
    @Operation(summary = "Xóa vai trò", description = "Xóa vai trò người dùng")
    public ApiResponse<Void> deleteRole(@PathVariable String name) {
        roleService.deleteRole(name);
        return ApiResponse.<Void>builder().build();
    }
}
