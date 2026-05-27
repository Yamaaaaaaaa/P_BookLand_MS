package com.bookland.book.controller;

import com.bookland.book.dto.request.BookCommentRequest;
import com.bookland.book.dto.response.ApiResponse;
import com.bookland.book.dto.response.BookCommentResponse;
import com.bookland.book.dto.response.BookCommentSummaryResponse;
import com.bookland.book.service.BookCommentService;
import com.bookland.book.exception.AppException;
import com.bookland.book.exception.ErrorCode;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/book-comments")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Book Comment", description = "API quản lý bình luận & đánh giá sách")
@SecurityRequirement(name = "BearerAuth")
public class BookCommentController {

    private final BookCommentService bookCommentService;

    @PostMapping
    @Operation(summary = "Đăng bình luận & đánh giá mới cho sách (Yêu cầu đã mua hàng)")
    public ResponseEntity<ApiResponse<BookCommentResponse>> createComment(
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @RequestHeader(value = "X-User-Email", required = false) String email,
            @RequestBody @Valid BookCommentRequest request
    ) {
        log.info("POST /book-comments by userId={}, email={}", userId, email);

        if (userId == null) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }

        BookCommentResponse response = bookCommentService.createComment(userId, email, request);
        return ResponseEntity.ok(ApiResponse.<BookCommentResponse>builder()
                .message("Đăng đánh giá thành công")
                .result(response)
                .build());
    }

    @GetMapping("/book/{bookId}")
    @Operation(summary = "Lấy danh sách đánh giá của cuốn sách (kèm thống kê sao trung bình)")
    public ResponseEntity<ApiResponse<BookCommentSummaryResponse>> getCommentsByBook(
            @PathVariable Long bookId,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDirection
    ) {
        log.info("GET /book-comments/book/{} with page={}, size={}", bookId, page, size);

        Sort.Direction direction = sortDirection.equalsIgnoreCase("ASC") 
                ? Sort.Direction.ASC 
                : Sort.Direction.DESC;
        
        int pageIndex = page > 0 ? page - 1 : 0;
        Pageable pageable = PageRequest.of(pageIndex, size, Sort.by(direction, sortBy));

        BookCommentSummaryResponse summary = bookCommentService.getCommentsByBook(bookId, pageable);
        return ResponseEntity.ok(ApiResponse.<BookCommentSummaryResponse>builder()
                .result(summary)
                .build());
    }

    @DeleteMapping("/{commentId}")
    @Operation(summary = "Xóa bình luận & đánh giá (Chính chủ)")
    public ResponseEntity<ApiResponse<Void>> deleteComment(
            @PathVariable Long commentId,
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @RequestHeader(value = "X-User-Roles", required = false) String roles
    ) {
        log.info("DELETE /book-comments/{} by userId={}", commentId, userId);

        if (userId == null) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }

        bookCommentService.deleteComment(commentId, userId, roles);
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .message("Xóa bình luận thành công")
                .build());
    }

    @DeleteMapping("/admin/{commentId}")
    @Operation(summary = "Xóa bình luận & đánh giá (Admin)")
    public ResponseEntity<ApiResponse<Void>> deleteCommentAdmin(
            @PathVariable Long commentId,
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @RequestHeader(value = "X-User-Roles", required = false) String roles
    ) {
        log.info("DELETE /book-comments/admin/{} by userId={}", commentId, userId);

        if (userId == null) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }

        bookCommentService.deleteComment(commentId, userId, roles);
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .message("Xóa bình luận thành công")
                .build());
    }
}
