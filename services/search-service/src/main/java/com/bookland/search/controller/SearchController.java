package com.bookland.search.controller;

import com.bookland.search.dto.ApiResponse;
import com.bookland.search.dto.BookDTO;
import com.bookland.search.dto.PageResponse;
import com.bookland.search.service.SearchService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/search")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "Search", description = "API tìm kiếm sách nâng cao sử dụng Elasticsearch")
public class SearchController {

    SearchService searchService;

    @PostMapping("/init-data")
    @Operation(summary = "Đồng bộ dữ liệu sách từ book-service sang Elasticsearch")
    public ApiResponse<String> initData() {
        String msg = searchService.initData();
        return ApiResponse.<String>builder()
                .result(msg)
                .build();
    }

    @GetMapping("/books")
    @Operation(summary = "Tìm kiếm sách nâng cao")
    public ApiResponse<PageResponse<BookDTO>> searchBooks(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) List<Long> authorIds,
            @RequestParam(required = false) List<Long> publisherIds,
            @RequestParam(required = false) List<Long> seriesIds,
            @RequestParam(required = false) List<Long> categoryIds,
            @RequestParam(required = false) Double minPrice,
            @RequestParam(required = false) Double maxPrice,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "bookId") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDirection
    ) {
        Sort.Direction direction = "ASC".equalsIgnoreCase(sortDirection) ? Sort.Direction.ASC : Sort.Direction.DESC;
        // Map common "id" sort to Elasticsearch "bookId"
        String sortField = "id".equals(sortBy) ? "bookId" : sortBy;
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortField));

        PageResponse<BookDTO> response = searchService.searchBooks(
                keyword, authorIds, publisherIds, seriesIds, categoryIds, minPrice, maxPrice, pageable
        );

        return ApiResponse.<PageResponse<BookDTO>>builder()
                .result(response)
                .build();
    }

    @PostMapping("/books")
    @Operation(summary = "Đồng bộ thêm/sửa sách vào Elasticsearch (Realtime)")
    public ApiResponse<Void> indexBook(@RequestBody BookDTO book) {
        searchService.indexBook(book);
        return ApiResponse.<Void>builder().message("Indexed successfully").build();
    }

    @DeleteMapping("/books/{id}")
    @Operation(summary = "Xóa sách khỏi Elasticsearch (Realtime)")
    public ApiResponse<Void> removeBook(@PathVariable Long id) {
        searchService.removeBook(id);
        return ApiResponse.<Void>builder().message("Deleted successfully").build();
    }

    @GetMapping("/books/{bookId}/document")
    @Operation(summary = "Lấy dữ liệu thô (BookDocument) đang lưu trong Elasticsearch của 1 cuốn sách")
    public ApiResponse<com.bookland.search.document.BookDocument> getBookDocument(@PathVariable Long bookId) {
        var doc = searchService.getBookDocument(bookId);
        return ApiResponse.<com.bookland.search.document.BookDocument>builder()
                .result(doc)
                .build();
    }

    @GetMapping("/books/{bookId}/keywords")
    @Operation(summary = "Lấy danh sách các keyword/token được phân tích và lưu trong Elasticsearch của 1 cuốn sách")
    public ApiResponse<List<String>> getBookKeywords(@PathVariable Long bookId) {
        List<String> keywords = searchService.getBookKeywords(bookId);
        return ApiResponse.<List<String>>builder()
                .result(keywords)
                .build();
    }
}
