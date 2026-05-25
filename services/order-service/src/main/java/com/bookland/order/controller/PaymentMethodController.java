package com.bookland.order.controller;

import com.bookland.order.dto.request.PaymentMethodRequest;
import com.bookland.order.dto.response.ApiResponse;
import com.bookland.order.dto.response.PageResponse;
import com.bookland.order.dto.response.PaymentMethodDTO;
import com.bookland.order.service.PaymentMethodService;
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
@RequestMapping("/api/payment-methods")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Payment Method", description = "API quản lý phương thức thanh toán")
public class PaymentMethodController {

    private final PaymentMethodService paymentMethodService;

    @PostMapping
    @Operation(summary = "Tạo phương thức thanh toán mới")
    public ResponseEntity<ApiResponse<PaymentMethodDTO>> create(
            @RequestBody @Valid PaymentMethodRequest request) {
        log.info("POST /api/payment-methods - name={}", request.getName());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(paymentMethodService.create(request));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Cập nhật phương thức thanh toán")
    public ResponseEntity<ApiResponse<PaymentMethodDTO>> update(
            @PathVariable Long id,
            @RequestBody @Valid PaymentMethodRequest request) {
        log.info("PUT /api/payment-methods/{}", id);
        return ResponseEntity.ok(paymentMethodService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Xóa phương thức thanh toán")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        log.info("DELETE /api/payment-methods/{}", id);
        return ResponseEntity.ok(paymentMethodService.delete(id));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Lấy phương thức thanh toán theo ID")
    public ResponseEntity<ApiResponse<PaymentMethodDTO>> getById(@PathVariable Long id) {
        log.info("GET /api/payment-methods/{}", id);
        return ResponseEntity.ok(paymentMethodService.getById(id));
    }

    @GetMapping
    @Operation(summary = "Lấy danh sách tất cả phương thức thanh toán (không phân trang)")
    public ResponseEntity<ApiResponse<List<PaymentMethodDTO>>> getAll() {
        log.info("GET /api/payment-methods");
        return ResponseEntity.ok(paymentMethodService.getAll());
    }

    @GetMapping("/paged")
    @Operation(summary = "Lấy danh sách phương thức thanh toán có phân trang")
    public ResponseEntity<ApiResponse<PageResponse<PaymentMethodDTO>>> getPage(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        log.info("GET /api/payment-methods/paged?page={}&size={}", page, size);
        return ResponseEntity.ok(paymentMethodService.getPage(page, size));
    }
}
