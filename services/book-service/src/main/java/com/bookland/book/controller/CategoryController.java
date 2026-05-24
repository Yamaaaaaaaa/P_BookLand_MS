package com.bookland.book.controller;

import com.bookland.book.dto.request.CategoryRequest;
import com.bookland.book.dto.response.ApiResponse;
import com.bookland.book.dto.response.CategoryDTO;
import com.bookland.book.dto.response.PageResponse;
import com.bookland.book.service.CategoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
@Tag(name = "Categories", description = "API quản lý danh mục")
@SecurityRequirement(name = "BearerAuth")
public class CategoryController {
    private final CategoryService categoryService;

    @GetMapping
    @Operation(summary = "Lấy danh sách danh mục")
    public ApiResponse<PageResponse<CategoryDTO>> getAllCategories(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Boolean pinned,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "ASC") String sortDirection
    ) {
        Sort.Direction dir = "ASC".equalsIgnoreCase(sortDirection) ? Sort.Direction.ASC : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(page, size, Sort.by(dir, sortBy));
        return ApiResponse.<PageResponse<CategoryDTO>>builder()
                .result(categoryService.getAllCategories(keyword, pinned, pageable)).build();
    }

    @GetMapping("/{id}")
    @Operation(summary = "Lấy chi tiết danh mục")
    public ApiResponse<CategoryDTO> getCategoryById(@PathVariable Long id) {
        return ApiResponse.<CategoryDTO>builder().result(categoryService.getCategoryById(id)).build();
    }

    @PostMapping
    @Operation(summary = "Tạo danh mục mới")
    public ApiResponse<CategoryDTO> createCategory(@Valid @RequestBody CategoryRequest request) {
        return ApiResponse.<CategoryDTO>builder().result(categoryService.createCategory(request)).build();
    }

    @PutMapping("/{id}")
    @Operation(summary = "Cập nhật danh mục")
    public ApiResponse<CategoryDTO> updateCategory(@PathVariable Long id,
                                                   @Valid @RequestBody CategoryRequest request) {
        return ApiResponse.<CategoryDTO>builder().result(categoryService.updateCategory(id, request)).build();
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Xóa danh mục")
    public ApiResponse<Void> deleteCategory(@PathVariable Long id) {
        categoryService.deleteCategory(id);
        return ApiResponse.<Void>builder().message("Xóa danh mục thành công").build();
    }
}
