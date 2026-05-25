package com.bookland.book.controller;

import com.bookland.book.dto.request.BookRequest;
import com.bookland.book.dto.response.ApiResponse;
import com.bookland.book.dto.response.BookDTO;
import com.bookland.book.dto.response.PageResponse;
import com.bookland.book.entity.Book.BookStatus;
import com.bookland.book.service.BookService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/books")
@RequiredArgsConstructor
@Tag(name = "Books", description = "API quản lý sách")
@SecurityRequirement(name = "BearerAuth")
public class BookController {
    private final BookService bookService;

    @GetMapping
    @Operation(summary = "Lấy danh sách sách", description = "Hỗ trợ filter, phân trang, sắp xếp")
    public ApiResponse<PageResponse<BookDTO>> getAllBooks(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) BookStatus status,
            @RequestParam(required = false) List<Long> authorIds,
            @RequestParam(required = false) List<Long> publisherIds,
            @RequestParam(required = false) List<Long> seriesIds,
            @RequestParam(required = false) List<Long> categoryIds,
            @RequestParam(required = false) Boolean pinned,
            @RequestParam(required = false) Double minPrice,
            @RequestParam(required = false) Double maxPrice,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDirection,
            @RequestParam(required = false) Boolean dbOnly
    ) {
        Sort.Direction direction = "ASC".equalsIgnoreCase(sortDirection) ? Sort.Direction.ASC : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));
        return ApiResponse.<PageResponse<BookDTO>>builder()
                .result(bookService.getAllBooks(keyword, status, authorIds, publisherIds,
                        seriesIds, categoryIds, pinned, minPrice, maxPrice, pageable, dbOnly))
                .build();
    }

    @GetMapping("/best-sellers")
    @Operation(summary = "Lấy sách bán chạy")
    public ApiResponse<PageResponse<BookDTO>> getBestSellingBooks(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Double minPrice,
            @RequestParam(required = false) Double maxPrice,
            @RequestParam(required = false) List<Long> categoryIds,
            @RequestParam(required = false) List<Long> authorIds,
            @RequestParam(required = false) List<Long> publisherIds,
            @RequestParam(required = false) List<Long> seriesIds,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        Pageable pageable = PageRequest.of(page, size);
        return ApiResponse.<PageResponse<BookDTO>>builder()
                .result(bookService.getBestSellingBooks(keyword, minPrice, maxPrice,
                        categoryIds, authorIds, publisherIds, seriesIds, pageable))
                .build();
    }

    @GetMapping("/{id}")
    @Operation(summary = "Lấy chi tiết sách")
    public ApiResponse<BookDTO> getBookById(@PathVariable Long id) {
        return ApiResponse.<BookDTO>builder().result(bookService.getBookById(id)).build();
    }

    @PostMapping
    @Operation(summary = "Tạo sách mới (Admin/Manager)")
    public ApiResponse<BookDTO> createBook(@Valid @RequestBody BookRequest request) {
        return ApiResponse.<BookDTO>builder().result(bookService.createBook(request)).build();
    }

    @PutMapping("/{id}")
    @Operation(summary = "Cập nhật sách (Admin/Manager)")
    public ApiResponse<BookDTO> updateBook(@PathVariable Long id,
                                           @Valid @RequestBody BookRequest request) {
        return ApiResponse.<BookDTO>builder().result(bookService.updateBook(id, request)).build();
    }

    @PatchMapping("/{id}/stock")
    @Operation(summary = "Cập nhật số lượng tồn kho")
    public ApiResponse<BookDTO> updateBookStock(@PathVariable Long id,
                                                @RequestParam Integer quantity) {
        return ApiResponse.<BookDTO>builder().result(bookService.updateBookStock(id, quantity)).build();
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Xóa sách (Admin/Manager)")
    public ApiResponse<Void> deleteBook(@PathVariable Long id) {
        bookService.deleteBook(id);
        return ApiResponse.<Void>builder().message("Xóa sách thành công").build();
    }
}
