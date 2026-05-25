package com.bookland.order.service;

import com.bookland.order.client.BookClient;
import com.bookland.order.dto.request.AddToCartRequest;
import com.bookland.order.dto.request.UpdateCartItemRequest;
import com.bookland.order.dto.response.ApiResponse;
import com.bookland.order.dto.response.BookResponse;
import com.bookland.order.dto.response.CartDTO;
import com.bookland.order.dto.response.CartItemDTO;
import com.bookland.order.entity.Cart;
import com.bookland.order.entity.Cart.CartStatus;
import com.bookland.order.entity.CartItem;
import com.bookland.order.exception.AppException;
import com.bookland.order.exception.ErrorCode;
import com.bookland.order.repository.CartItemRepository;
import com.bookland.order.repository.CartRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class CartService {

    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;
    private final BookClient bookClient;

    // ──────────────────────────────────────────────────────────────────────────
    // GET CART
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Lấy giỏ hàng đang BUYING của userId.
     * Nếu chưa có, tự động tạo mới.
     */
    public ApiResponse<CartDTO> getMyCart(String userId) {
        log.info("Getting cart for userId={}", userId);
        Cart cart = cartRepository.findByUserIdAndStatus(userId, CartStatus.BUYING)
                .orElseGet(() -> createNewCart(userId));
        return ApiResponse.<CartDTO>builder()
                .result(toDTO(cart))
                .build();
    }

    // ──────────────────────────────────────────────────────────────────────────
    // ADD TO CART
    // ──────────────────────────────────────────────────────────────────────────

    @Transactional
    public ApiResponse<CartDTO> addToCart(String userId, AddToCartRequest request) {
        log.info("addToCart userId={} bookId={} qty={}", userId, request.getBookId(), request.getQuantity());

        // Lấy thông tin sách từ book-service
        BookResponse book = fetchBook(request.getBookId());

        // Kiểm tra stock
        if (book.getStock() < request.getQuantity()) {
            throw new AppException(ErrorCode.BOOK_OUT_OF_STOCK);
        }

        Cart cart = cartRepository.findByUserIdAndStatus(userId, CartStatus.BUYING)
                .orElseGet(() -> createNewCart(userId));

        // Nếu sách đã có trong giỏ → cộng số lượng
        CartItem existingItem = cartItemRepository
                .findByCartIdAndBookId(cart.getId(), request.getBookId())
                .orElse(null);

        if (existingItem != null) {
            int newQty = existingItem.getQuantity() + request.getQuantity();
            if (book.getStock() < newQty) {
                throw new AppException(ErrorCode.BOOK_OUT_OF_STOCK);
            }
            existingItem.setQuantity(newQty);
            cartItemRepository.save(existingItem);
        } else {
            CartItem newItem = CartItem.builder()
                    .cart(cart)
                    .bookId(request.getBookId())
                    .quantity(request.getQuantity())
                    .build();
            cart.getItems().add(newItem);
        }

        Cart saved = cartRepository.save(cart);
        return ApiResponse.<CartDTO>builder()
                .message("Đã thêm vào giỏ hàng")
                .result(toDTO(saved))
                .build();
    }

    // ──────────────────────────────────────────────────────────────────────────
    // UPDATE QUANTITY
    // ──────────────────────────────────────────────────────────────────────────

    @Transactional
    public ApiResponse<CartDTO> updateCartItem(String userId, Long bookId, UpdateCartItemRequest request) {
        log.info("updateCartItem userId={} bookId={} qty={}", userId, bookId, request.getQuantity());

        Cart cart = cartRepository.findByUserIdAndStatus(userId, CartStatus.BUYING)
                .orElseThrow(() -> new AppException(ErrorCode.CART_NOT_FOUND));

        CartItem cartItem = cartItemRepository.findByCartIdAndBookId(cart.getId(), bookId)
                .orElseThrow(() -> new AppException(ErrorCode.CART_ITEM_NOT_FOUND));

        // Kiểm tra stock từ book-service
        BookResponse book = fetchBook(bookId);
        if (book.getStock() < request.getQuantity()) {
            throw new AppException(ErrorCode.BOOK_OUT_OF_STOCK);
        }

        cartItem.setQuantity(request.getQuantity());
        cartItemRepository.save(cartItem);

        Cart updatedCart = cartRepository.findById(cart.getId()).orElseThrow();
        return ApiResponse.<CartDTO>builder()
                .message("Cập nhật số lượng thành công")
                .result(toDTO(updatedCart))
                .build();
    }

    // ──────────────────────────────────────────────────────────────────────────
    // REMOVE ONE ITEM
    // ──────────────────────────────────────────────────────────────────────────

    @Transactional
    public ApiResponse<CartDTO> removeFromCart(String userId, Long bookId) {
        log.info("removeFromCart userId={} bookId={}", userId, bookId);

        Cart cart = cartRepository.findByUserIdAndStatus(userId, CartStatus.BUYING)
                .orElseThrow(() -> new AppException(ErrorCode.CART_NOT_FOUND));

        CartItem cartItem = cartItemRepository.findByCartIdAndBookId(cart.getId(), bookId)
                .orElseThrow(() -> new AppException(ErrorCode.CART_ITEM_NOT_FOUND));

        cart.getItems().remove(cartItem);
        cartItemRepository.delete(cartItem);
        Cart saved = cartRepository.save(cart);

        return ApiResponse.<CartDTO>builder()
                .message("Đã xóa sản phẩm khỏi giỏ hàng")
                .result(toDTO(saved))
                .build();
    }

    // ──────────────────────────────────────────────────────────────────────────
    // REMOVE MULTIPLE ITEMS (Batch) — dùng khi checkout một số sản phẩm
    // ──────────────────────────────────────────────────────────────────────────

    @Transactional
    public ApiResponse<CartDTO> removeMultipleFromCart(String userId, List<Long> bookIds) {
        log.info("removeMultipleFromCart userId={} bookIds={}", userId, bookIds);

        Cart cart = cartRepository.findByUserIdAndStatus(userId, CartStatus.BUYING)
                .orElseThrow(() -> new AppException(ErrorCode.CART_NOT_FOUND));

        List<CartItem> itemsToRemove = cartItemRepository
                .findByCartIdAndBookIdIn(cart.getId(), bookIds);

        cart.getItems().removeAll(itemsToRemove);
        cartItemRepository.deleteAllInBatch(itemsToRemove);
        Cart saved = cartRepository.save(cart);

        return ApiResponse.<CartDTO>builder()
                .message("Đã xóa " + itemsToRemove.size() + " sản phẩm khỏi giỏ hàng")
                .result(toDTO(saved))
                .build();
    }

    // ──────────────────────────────────────────────────────────────────────────
    // CLEAR CART
    // ──────────────────────────────────────────────────────────────────────────

    @Transactional
    public ApiResponse<Void> clearCart(String userId) {
        log.info("clearCart userId={}", userId);

        Cart cart = cartRepository.findByUserIdAndStatus(userId, CartStatus.BUYING)
                .orElseThrow(() -> new AppException(ErrorCode.CART_NOT_FOUND));

        cart.getItems().clear();
        cartRepository.save(cart);

        return ApiResponse.<Void>builder()
                .message("Đã xóa toàn bộ giỏ hàng")
                .build();
    }

    // ──────────────────────────────────────────────────────────────────────────
    // PRIVATE HELPERS
    // ──────────────────────────────────────────────────────────────────────────

    private Cart createNewCart(String userId) {
        log.info("Creating new cart for userId={}", userId);
        Cart cart = Cart.builder()
                .userId(userId)
                .status(CartStatus.BUYING)
                .build();
        return cartRepository.save(cart);
    }

    private BookResponse fetchBook(Long bookId) {
        try {
            ApiResponse<BookResponse> response = bookClient.getBookById(bookId);
            if (response == null || response.getResult() == null) {
                throw new AppException(ErrorCode.BOOK_NOT_FOUND);
            }
            return response.getResult();
        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to fetch book id={} from book-service: {}", bookId, e.getMessage());
            throw new AppException(ErrorCode.BOOK_SERVICE_ERROR);
        }
    }

    /**
     * Chuyển Cart entity → CartDTO, enrich từng item với thông tin sách từ book-service.
     * Nếu book-service lỗi, vẫn trả item với thông tin tối thiểu (bookId, quantity).
     */
    private CartDTO toDTO(Cart cart) {
        List<CartItemDTO> itemDTOs = cart.getItems().stream()
                .map(this::toItemDTO)
                .toList();

        double totalAmount = itemDTOs.stream()
                .mapToDouble(item -> item.getSubtotal() != null ? item.getSubtotal() : 0.0)
                .sum();

        int totalItems = itemDTOs.stream()
                .mapToInt(item -> item.getQuantity() != null ? item.getQuantity() : 0)
                .sum();

        return CartDTO.builder()
                .id(cart.getId())
                .userId(cart.getUserId())
                .status(cart.getStatus())
                .items(itemDTOs)
                .totalAmount(totalAmount)
                .totalItems(totalItems)
                .createdAt(cart.getCreatedAt())
                .updatedAt(cart.getUpdatedAt())
                .build();
    }

    private CartItemDTO toItemDTO(CartItem item) {
        CartItemDTO.CartItemDTOBuilder builder = CartItemDTO.builder()
                .id(item.getId())
                .bookId(item.getBookId())
                .quantity(item.getQuantity());

        try {
            BookResponse book = fetchBook(item.getBookId());
            double finalPrice = book.getFinalPrice() != null ? book.getFinalPrice() : 0.0;
            builder
                    .bookName(book.getName())
                    .bookImageUrl(book.getBookImageUrl())
                    .originalPrice(book.getOriginalCost())
                    .salePercent(book.getSale())
                    .finalPrice(finalPrice)
                    .availableStock(book.getStock())
                    .subtotal(finalPrice * item.getQuantity());
        } catch (Exception e) {
            // Graceful degradation: book-service tạm lỗi, vẫn trả về item với bookId
            log.warn("Could not enrich cart item bookId={}: {}", item.getBookId(), e.getMessage());
            builder.bookName("Không thể tải thông tin sách").subtotal(0.0);
        }

        return builder.build();
    }
}
