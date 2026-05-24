package com.bookland.user.controller;

import com.bookland.user.dto.RoleDTO;
import com.bookland.user.dto.request.RoleRequest;
import com.bookland.user.dto.response.ApiResponse;
import com.bookland.user.service.RoleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/roles")
@RequiredArgsConstructor
@SecurityRequirement(name = "BearerAuth")
@Tag(name = "Role", description = "API quản lý vai trò người dùng")
@PreAuthorize("hasRole('ROLE_ADMIN')")
public class RoleController {

    private final RoleService roleService;

    @GetMapping
    @Operation(summary = "Lấy danh sách vai trò", description = "Lấy danh sách vai trò có phân trang và tìm kiếm")
    public ApiResponse<Page<RoleDTO>> getAllRoles(
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "ASC") String sortDirection
    ) {
        Sort.Direction direction = sortDirection.equalsIgnoreCase("ASC")
                ? Sort.Direction.ASC
                : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));

        Page<RoleDTO> roles = roleService.getAllRoles(keyword, pageable);
        return ApiResponse.<Page<RoleDTO>>builder().result(roles).build();
    }

    @GetMapping("/{id}")
    @Operation(summary = "Lấy chi tiết vai trò", description = "Lấy thông tin chi tiết của một vai trò")
    public ApiResponse<RoleDTO> getRoleById(@PathVariable Long id) {
        return ApiResponse.<RoleDTO>builder()
                .result(roleService.getRoleById(id))
                .build();
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ROLE_ADMIN', 'ROLE_MANAGER')")
    @Operation(summary = "Tạo vai trò mới", description = "Tạo một vai trò người dùng mới")
    public ApiResponse<RoleDTO> createRole(@Valid @RequestBody RoleRequest request) {
        return ApiResponse.<RoleDTO>builder()
                .result(roleService.createRole(request))
                .build();
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ROLE_ADMIN', 'ROLE_MANAGER')")
    @Operation(summary = "Cập nhật vai trò", description = "Cập nhật thông tin vai trò")
    public ApiResponse<RoleDTO> updateRole(
            @PathVariable Long id,
            @Valid @RequestBody RoleRequest request) {
        return ApiResponse.<RoleDTO>builder()
                .result(roleService.updateRole(id, request))
                .build();
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ROLE_ADMIN', 'ROLE_MANAGER')")
    @Operation(summary = "Xóa vai trò", description = "Xóa vai trò (chỉ khi không có user nào sử dụng)")
    public ApiResponse<Void> deleteRole(@PathVariable Long id) {
        roleService.deleteRole(id);
        return ApiResponse.<Void>builder().build();
    }
}
