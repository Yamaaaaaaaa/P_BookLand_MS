package com.bookland.order.controller;

import com.bookland.order.dto.request.ShippingMethodRequest;
import com.bookland.order.dto.response.ApiResponse;
import com.bookland.order.dto.response.PageResponse;
import com.bookland.order.dto.response.ShippingMethodDTO;
import com.bookland.order.service.ShippingMethodService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/shipping-methods")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Shipping Method", description = "API quản lý phương thức vận chuyển")
public class ShippingMethodController {

    private final ShippingMethodService shippingMethodService;

    @PostMapping
    @Operation(summary = "Tạo phương thức vận chuyển mới")
    public ResponseEntity<ApiResponse<ShippingMethodDTO>> create(
            @RequestBody @Valid ShippingMethodRequest request) {
        log.info("POST /api/shipping-methods - name={}", request.getName());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(shippingMethodService.create(request));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Cập nhật phương thức vận chuyển")
    public ResponseEntity<ApiResponse<ShippingMethodDTO>> update(
            @PathVariable Long id,
            @RequestBody @Valid ShippingMethodRequest request) {
        log.info("PUT /api/shipping-methods/{}", id);
        return ResponseEntity.ok(shippingMethodService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Xóa phương thức vận chuyển")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        log.info("DELETE /api/shipping-methods/{}", id);
        return ResponseEntity.ok(shippingMethodService.delete(id));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Lấy phương thức vận chuyển theo ID")
    public ResponseEntity<ApiResponse<ShippingMethodDTO>> getById(@PathVariable Long id) {
        log.info("GET /api/shipping-methods/{}", id);
        return ResponseEntity.ok(shippingMethodService.getById(id));
    }

    @GetMapping
    @Operation(summary = "Lấy danh sách tất cả phương thức vận chuyển (phân trang)")
    public ResponseEntity<ApiResponse<PageResponse<ShippingMethodDTO>>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "100") int size) {
        log.info("GET /api/shipping-methods page={} size={}", page, size);
        return ResponseEntity.ok(shippingMethodService.getPage(page, size));
    }

    @GetMapping("/paged")
    @Operation(summary = "Lấy danh sách phương thức vận chuyển có phân trang")
    public ResponseEntity<ApiResponse<PageResponse<ShippingMethodDTO>>> getPage(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        log.info("GET /api/shipping-methods/paged?page={}&size={}", page, size);
        return ResponseEntity.ok(shippingMethodService.getPage(page, size));
    }
}
