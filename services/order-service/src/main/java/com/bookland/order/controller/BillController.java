package com.bookland.order.controller;

import com.bookland.order.dto.request.CreateBillRequest;
import com.bookland.order.dto.request.UpdateBillStatusRequest;
import com.bookland.order.dto.response.ApiResponse;
import com.bookland.order.dto.response.BillDTO;
import com.bookland.order.dto.response.BillPreviewDTO;
import com.bookland.order.entity.Bill.BillStatus;
import com.bookland.order.service.BillService;
import com.bookland.order.exception.AppException;
import com.bookland.order.exception.ErrorCode;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/bills")
@RequiredArgsConstructor
@Slf4j
@SecurityRequirement(name = "BearerAuth")
@Tag(name = "Bill", description = "API quản lý đơn hàng (Bill)")
public class BillController {

    private final BillService billService;

    @GetMapping
    @Operation(summary = "Lấy tất cả đơn hàng (Admin/Manager/Staff)")
    public ResponseEntity<ApiResponse<Page<BillDTO>>> getAllBills(
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) BillStatus status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime toDate,
            @RequestParam(required = false) Double minCost,
            @RequestParam(required = false) Double maxCost,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDirection
    ) {
        log.info("GET /api/bills filters active");
        Sort.Direction direction = sortDirection.equalsIgnoreCase("ASC")
                ? Sort.Direction.ASC
                : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));

        Page<BillDTO> bills = billService.getAllBills(userId, status, fromDate, toDate, minCost, maxCost, pageable);
        return ResponseEntity.ok(ApiResponse.<Page<BillDTO>>builder().result(bills).build());
    }

    @GetMapping("/my-bills")
    @Operation(summary = "Lấy danh sách đơn hàng cá nhân")
    public ResponseEntity<ApiResponse<Page<BillDTO>>> getOwnBills(
            @Parameter(hidden = true) @RequestHeader("X-User-Id") Long userId,
            @RequestParam(required = false) BillStatus status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime toDate,
            @RequestParam(required = false) Double minCost,
            @RequestParam(required = false) Double maxCost,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDirection
    ) {
        log.info("GET /api/bills/my-bills for userId={}", userId);
        Sort.Direction direction = sortDirection.equalsIgnoreCase("ASC")
                ? Sort.Direction.ASC
                : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));

        Page<BillDTO> bills = billService.getOwnBills(userId, status, fromDate, toDate, minCost, maxCost, pageable);
        return ResponseEntity.ok(ApiResponse.<Page<BillDTO>>builder().result(bills).build());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Lấy chi tiết đơn hàng theo ID")
    public ResponseEntity<ApiResponse<BillDTO>> getBillById(@PathVariable Long id) {
        log.info("GET /api/bills/{}", id);
        return ResponseEntity.ok(ApiResponse.<BillDTO>builder().result(billService.getBillById(id)).build());
    }

    @PostMapping
    @Operation(summary = "Tạo đơn hàng mới")
    public ResponseEntity<ApiResponse<BillDTO>> createBill(
            @Parameter(hidden = true) @RequestHeader("X-User-Id") Long userId,
            @Valid @RequestBody CreateBillRequest request
    ) {
        log.info("POST /api/bills from userId={}", userId);
        return ResponseEntity.ok(ApiResponse.<BillDTO>builder()
                .message("Đặt hàng thành công")
                .result(billService.createBill(userId, request))
                .build());
    }

    @PostMapping("/preview")
    @Operation(summary = "Xem trước hóa đơn để tính khuyến mãi/vận chuyển")
    public ResponseEntity<ApiResponse<BillPreviewDTO>> previewBill(
            @Parameter(hidden = true) @RequestHeader("X-User-Id") Long userId,
            @Valid @RequestBody CreateBillRequest request
    ) {
        log.info("POST /api/bills/preview from userId={}", userId);
        return ResponseEntity.ok(ApiResponse.<BillPreviewDTO>builder()
                .message("Xem trước hóa đơn thành công")
                .result(billService.previewBill(userId, request))
                .build());
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Cập nhật trạng thái đơn hàng (Admin/Manager/Staff)")
    public ResponseEntity<ApiResponse<BillDTO>> updateBillStatus(
            @Parameter(hidden = true) @RequestHeader("X-User-Email") String approverEmail,
            @PathVariable Long id,
            @Valid @RequestBody UpdateBillStatusRequest request
    ) {
        log.info("PATCH /api/bills/{}/status from approver={}", id, approverEmail);
        return ResponseEntity.ok(ApiResponse.<BillDTO>builder()
                .message("Cập nhật trạng thái đơn hàng thành công")
                .result(billService.updateBillStatus(id, request, approverEmail))
                .build());
    }

    @PatchMapping("/{id}/confirm-delivered")
    @Operation(summary = "Xác nhận đã giao hàng thành công (Chỉ dành cho Shipper)")
    public ResponseEntity<ApiResponse<BillDTO>> confirmDelivered(
            @PathVariable Long id,
            @Parameter(hidden = true) @RequestHeader("X-User-Email") String email,
            @Parameter(hidden = true) @RequestHeader("X-User-Roles") String roles
    ) {
        log.info("PATCH /api/bills/{}/confirm-delivered from email={}", id, email);
        if (roles == null || !roles.contains("ROLE_SHIPPER")) {
            throw new AppException(ErrorCode.FORBIDDEN);
        }
        return ResponseEntity.ok(ApiResponse.<BillDTO>builder()
                .message("Xác nhận đã giao hàng thành công")
                .result(billService.confirmDelivered(id, email))
                .build());
    }

    @GetMapping("/shipping-list")
    @Operation(summary = "Lấy danh sách đơn hàng đang giao (Chỉ dành cho Shipper)")
    public ResponseEntity<ApiResponse<Page<BillDTO>>> getShippingBills(
            @Parameter(hidden = true) @RequestHeader("X-User-Roles") String roles,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDirection
    ) {
        log.info("GET /api/bills/shipping-list");
        if (roles == null || (!roles.contains("ROLE_SHIPPER") && !roles.contains("ROLE_ADMIN"))) {
            throw new AppException(ErrorCode.FORBIDDEN);
        }
        Sort.Direction direction = sortDirection.equalsIgnoreCase("ASC")
                ? Sort.Direction.ASC
                : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));
        Page<BillDTO> bills = billService.getAllBills(null, BillStatus.SHIPPING, null, null, null, null, pageable);
        return ResponseEntity.ok(ApiResponse.<Page<BillDTO>>builder().result(bills).build());
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Xóa đơn hàng (Admin/Manager)")
    public ResponseEntity<ApiResponse<Void>> deleteBill(@PathVariable Long id) {
        log.info("DELETE /api/bills/{}", id);
        billService.deleteBill(id);
        return ResponseEntity.ok(ApiResponse.<Void>builder().message("Xóa đơn hàng thành công").build());
    }

    @GetMapping("/internal/verify-purchase")
    @Operation(summary = "Xác thực người dùng đã mua sách thành công (Internal API)")
    public ResponseEntity<ApiResponse<Boolean>> verifyPurchase(
            @RequestParam Long userId,
            @RequestParam Long bookId
    ) {
        log.info("GET /api/bills/internal/verify-purchase?userId={}&bookId={}", userId, bookId);
        return ResponseEntity.ok(ApiResponse.<Boolean>builder()
                .result(billService.verifyPurchase(userId, bookId))
                .build());
    }
}
