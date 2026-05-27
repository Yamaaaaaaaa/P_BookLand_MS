package com.bookland.book.controller;

import com.bookland.book.dto.response.ApiResponse;
import com.bookland.book.service.DataInitService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@Tag(name = "Admin", description = "API quản trị hệ thống")
@SecurityRequirement(name = "BearerAuth")
public class AdminInitController {
    private final DataInitService dataInitService;

    @PostMapping("/init-data")
    @Operation(
        summary = "Khởi tạo dữ liệu mẫu",
        description = "Seed toàn bộ dữ liệu mẫu (Authors, Publishers, Series, Categories, Books). " +
                      "Chỉ chạy được khi DB trống. Gọi thủ công, không tự động."
    )
    public ApiResponse<String> initData() {
        String message = dataInitService.initData();
        return ApiResponse.<String>builder().result(message).build();
    }

    @PostMapping("/clear-data")
    @Operation(
        summary = "Xóa toàn bộ dữ liệu",
        description = "Xóa sạch toàn bộ dữ liệu trong DB (Comments, Books, Categories, Series, Publishers, Authors)."
    )
    public ApiResponse<String> clearData() {
        String message = dataInitService.clearData();
        return ApiResponse.<String>builder().result(message).build();
    }
}
