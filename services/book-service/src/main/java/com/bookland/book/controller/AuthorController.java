package com.bookland.book.controller;

import com.bookland.book.dto.request.AuthorRequest;
import com.bookland.book.dto.response.ApiResponse;
import com.bookland.book.dto.response.AuthorDTO;
import com.bookland.book.dto.response.PageResponse;
import com.bookland.book.service.AuthorService;
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
@RequestMapping("/api/authors")
@RequiredArgsConstructor
@Tag(name = "Authors", description = "API quản lý tác giả")
@SecurityRequirement(name = "BearerAuth")
public class AuthorController {
    private final AuthorService authorService;

    @GetMapping
    @Operation(summary = "Lấy danh sách tác giả")
    public ApiResponse<PageResponse<AuthorDTO>> getAllAuthors(
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDirection
    ) {
        Sort.Direction dir = "ASC".equalsIgnoreCase(sortDirection) ? Sort.Direction.ASC : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(page, size, Sort.by(dir, sortBy));
        return ApiResponse.<PageResponse<AuthorDTO>>builder()
                .result(authorService.getAllAuthors(keyword, pageable)).build();
    }

    @GetMapping("/{id}")
    @Operation(summary = "Lấy chi tiết tác giả")
    public ApiResponse<AuthorDTO> getAuthorById(@PathVariable Long id) {
        return ApiResponse.<AuthorDTO>builder().result(authorService.getAuthorById(id)).build();
    }

    @PostMapping
    @Operation(summary = "Tạo tác giả mới")
    public ApiResponse<AuthorDTO> createAuthor(@Valid @RequestBody AuthorRequest request) {
        return ApiResponse.<AuthorDTO>builder().result(authorService.createAuthor(request)).build();
    }

    @PutMapping("/{id}")
    @Operation(summary = "Cập nhật tác giả")
    public ApiResponse<AuthorDTO> updateAuthor(@PathVariable Long id,
                                               @Valid @RequestBody AuthorRequest request) {
        return ApiResponse.<AuthorDTO>builder().result(authorService.updateAuthor(id, request)).build();
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Xóa tác giả")
    public ApiResponse<Void> deleteAuthor(@PathVariable Long id) {
        authorService.deleteAuthor(id);
        return ApiResponse.<Void>builder().message("Xóa tác giả thành công").build();
    }
}
