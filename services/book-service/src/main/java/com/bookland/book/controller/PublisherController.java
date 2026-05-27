package com.bookland.book.controller;

import com.bookland.book.dto.request.PublisherRequest;
import com.bookland.book.dto.response.ApiResponse;
import com.bookland.book.dto.response.PageResponse;
import com.bookland.book.dto.response.PublisherDTO;
import com.bookland.book.service.PublisherService;
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
@RequestMapping("/api/publishers")
@RequiredArgsConstructor
@Tag(name = "Publishers", description = "API quản lý nhà xuất bản")
@SecurityRequirement(name = "BearerAuth")
public class PublisherController {
    private final PublisherService publisherService;

    @GetMapping
    @Operation(summary = "Lấy danh sách nhà xuất bản")
    public ApiResponse<PageResponse<PublisherDTO>> getAllPublishers(
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDirection
    ) {
        Sort.Direction dir = "ASC".equalsIgnoreCase(sortDirection) ? Sort.Direction.ASC : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(page, size, Sort.by(dir, sortBy));
        return ApiResponse.<PageResponse<PublisherDTO>>builder()
                .result(publisherService.getAllPublishers(keyword, pageable)).build();
    }

    @GetMapping("/{id}")
    @Operation(summary = "Lấy chi tiết nhà xuất bản")
    public ApiResponse<PublisherDTO> getPublisherById(@PathVariable Long id) {
        return ApiResponse.<PublisherDTO>builder().result(publisherService.getPublisherById(id)).build();
    }

    @PostMapping
    @Operation(summary = "Tạo nhà xuất bản mới")
    public ApiResponse<PublisherDTO> createPublisher(@Valid @RequestBody PublisherRequest request) {
        return ApiResponse.<PublisherDTO>builder().result(publisherService.createPublisher(request)).build();
    }

    @PutMapping("/{id}")
    @Operation(summary = "Cập nhật nhà xuất bản")
    public ApiResponse<PublisherDTO> updatePublisher(@PathVariable Long id,
                                                     @Valid @RequestBody PublisherRequest request) {
        return ApiResponse.<PublisherDTO>builder().result(publisherService.updatePublisher(id, request)).build();
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Xóa nhà xuất bản")
    public ApiResponse<Void> deletePublisher(@PathVariable Long id) {
        publisherService.deletePublisher(id);
        return ApiResponse.<Void>builder().message("Xóa nhà xuất bản thành công").build();
    }
}
