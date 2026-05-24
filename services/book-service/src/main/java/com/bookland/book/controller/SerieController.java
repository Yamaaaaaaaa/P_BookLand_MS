package com.bookland.book.controller;

import com.bookland.book.dto.request.SerieRequest;
import com.bookland.book.dto.response.ApiResponse;
import com.bookland.book.dto.response.PageResponse;
import com.bookland.book.dto.response.SerieDTO;
import com.bookland.book.service.SerieService;
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
@RequestMapping("/api/series")
@RequiredArgsConstructor
@Tag(name = "Series", description = "API quản lý bộ sách")
@SecurityRequirement(name = "BearerAuth")
public class SerieController {
    private final SerieService serieService;

    @GetMapping
    @Operation(summary = "Lấy danh sách bộ sách")
    public ApiResponse<PageResponse<SerieDTO>> getAllSeries(
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDirection
    ) {
        Sort.Direction dir = "ASC".equalsIgnoreCase(sortDirection) ? Sort.Direction.ASC : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(page, size, Sort.by(dir, sortBy));
        return ApiResponse.<PageResponse<SerieDTO>>builder()
                .result(serieService.getAllSeries(keyword, pageable)).build();
    }

    @GetMapping("/{id}")
    @Operation(summary = "Lấy chi tiết bộ sách")
    public ApiResponse<SerieDTO> getSerieById(@PathVariable Long id) {
        return ApiResponse.<SerieDTO>builder().result(serieService.getSerieById(id)).build();
    }

    @PostMapping
    @Operation(summary = "Tạo bộ sách mới")
    public ApiResponse<SerieDTO> createSerie(@Valid @RequestBody SerieRequest request) {
        return ApiResponse.<SerieDTO>builder().result(serieService.createSerie(request)).build();
    }

    @PutMapping("/{id}")
    @Operation(summary = "Cập nhật bộ sách")
    public ApiResponse<SerieDTO> updateSerie(@PathVariable Long id,
                                             @Valid @RequestBody SerieRequest request) {
        return ApiResponse.<SerieDTO>builder().result(serieService.updateSerie(id, request)).build();
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Xóa bộ sách")
    public ApiResponse<Void> deleteSerie(@PathVariable Long id) {
        serieService.deleteSerie(id);
        return ApiResponse.<Void>builder().message("Xóa bộ sách thành công").build();
    }
}
