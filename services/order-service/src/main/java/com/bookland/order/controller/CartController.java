package com.bookland.order.controller;

import com.bookland.order.dto.request.AddToCartRequest;
import com.bookland.order.dto.request.UpdateCartItemRequest;
import com.bookland.order.dto.response.ApiResponse;
import com.bookland.order.dto.response.CartDTO;
import com.bookland.order.service.CartService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Cart Controller.
 *
 * userId được lấy từ header "X-User-Id" (Long) do api-gateway inject vào sau khi xác thực JWT.
 * Tất cả API đều nhận X-User-Id từ header — không cần truyền trong path/body.
 */
@RestController
@RequestMapping("/api/carts")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Cart", description = "API quản lý giỏ hàng")
public class CartController {

    private final CartService cartService;

    // ─────────────────────────────────────────────────────────────────────────
    // GET MY CART
    // ─────────────────────────────────────────────────────────────────────────

    @GetMapping("/my")
    @Operation(summary = "Lấy giỏ hàng của tôi",
               description = "Tự động tạo giỏ hàng mới nếu chưa có. userId lấy từ header X-User-Id.")
    public ResponseEntity<ApiResponse<CartDTO>> getMyCart(
            @Parameter(hidden = true) @RequestHeader("X-User-Id") Long userId) {
        log.info("GET /api/carts/my userId={}", userId);
        return ResponseEntity.ok(cartService.getMyCart(userId));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ADD TO CART
    // ─────────────────────────────────────────────────────────────────────────

    @PostMapping("/my/items")
    @Operation(summary = "Thêm sách vào giỏ hàng",
               description = "Nếu sách đã có trong giỏ thì cộng thêm số lượng. Kiểm tra stock từ book-service.")
    public ResponseEntity<ApiResponse<CartDTO>> addToCart(
            @Parameter(hidden = true) @RequestHeader("X-User-Id") Long userId,
            @RequestBody @Valid AddToCartRequest request) {
        log.info("POST /api/carts/my/items userId={} bookId={}", userId, request.getBookId());
        return ResponseEntity.ok(cartService.addToCart(userId, request));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // UPDATE QUANTITY
    // ─────────────────────────────────────────────────────────────────────────

    @PutMapping("/my/items/{bookId}")
    @Operation(summary = "Cập nhật số lượng sản phẩm trong giỏ",
               description = "Kiểm tra số lượng tồn kho trước khi cập nhật.")
    public ResponseEntity<ApiResponse<CartDTO>> updateCartItem(
            @Parameter(hidden = true) @RequestHeader("X-User-Id") Long userId,
            @PathVariable Long bookId,
            @RequestBody @Valid UpdateCartItemRequest request) {
        log.info("PUT /api/carts/my/items/{} userId={}", bookId, userId);
        return ResponseEntity.ok(cartService.updateCartItem(userId, bookId, request));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // REMOVE ONE ITEM
    // ─────────────────────────────────────────────────────────────────────────

    @DeleteMapping("/my/items/{bookId}")
    @Operation(summary = "Xóa một sản phẩm khỏi giỏ hàng")
    public ResponseEntity<ApiResponse<CartDTO>> removeFromCart(
            @Parameter(hidden = true) @RequestHeader("X-User-Id") Long userId,
            @PathVariable Long bookId) {
        log.info("DELETE /api/carts/my/items/{} userId={}", bookId, userId);
        return ResponseEntity.ok(cartService.removeFromCart(userId, bookId));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // REMOVE BATCH ITEMS
    // ─────────────────────────────────────────────────────────────────────────

    @DeleteMapping("/my/items/batch")
    @Operation(summary = "Xóa nhiều sản phẩm khỏi giỏ hàng",
               description = "Request body là danh sách bookId. Dùng sau khi checkout một phần giỏ hàng.")
    public ResponseEntity<ApiResponse<CartDTO>> removeMultipleFromCart(
            @Parameter(hidden = true) @RequestHeader("X-User-Id") Long userId,
            @RequestBody List<Long> bookIds) {
        log.info("DELETE /api/carts/my/items/batch userId={} bookIds={}", userId, bookIds);
        return ResponseEntity.ok(cartService.removeMultipleFromCart(userId, bookIds));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CLEAR CART
    // ─────────────────────────────────────────────────────────────────────────

    @DeleteMapping("/my")
    @Operation(summary = "Xóa toàn bộ giỏ hàng",
               description = "Xóa hết items nhưng vẫn giữ record cart. Dùng sau khi checkout toàn bộ.")
    public ResponseEntity<ApiResponse<Void>> clearCart(
            @Parameter(hidden = true) @RequestHeader("X-User-Id") Long userId) {
        log.info("DELETE /api/carts/my userId={}", userId);
        return ResponseEntity.ok(cartService.clearCart(userId));
    }
}
