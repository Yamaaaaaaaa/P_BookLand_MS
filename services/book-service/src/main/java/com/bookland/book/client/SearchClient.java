package com.bookland.book.client;

import com.bookland.book.dto.response.ApiResponse;
import com.bookland.book.dto.response.BookDTO;
import com.bookland.book.dto.response.PageResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;

@FeignClient(name = "search-service", url = "${SEARCH_SERVICE_HOST:http://localhost}:8088")
public interface SearchClient {

    @GetMapping("/api/search/books")
    ApiResponse<PageResponse<BookDTO>> searchBooks(
            @RequestParam(value = "keyword", required = false) String keyword,
            @RequestParam(value = "authorIds", required = false) List<Long> authorIds,
            @RequestParam(value = "publisherIds", required = false) List<Long> publisherIds,
            @RequestParam(value = "seriesIds", required = false) List<Long> seriesIds,
            @RequestParam(value = "categoryIds", required = false) List<Long> categoryIds,
            @RequestParam(value = "minPrice", required = false) Double minPrice,
            @RequestParam(value = "maxPrice", required = false) Double maxPrice,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "10") int size,
            @RequestParam(value = "sortBy", defaultValue = "id") String sortBy,
            @RequestParam(value = "sortDirection", defaultValue = "DESC") String sortDirection
    );

    @org.springframework.web.bind.annotation.PostMapping("/api/search/books")
    ApiResponse<Void> indexBook(@org.springframework.web.bind.annotation.RequestBody BookDTO book);

    @org.springframework.web.bind.annotation.DeleteMapping("/api/search/books/{id}")
    ApiResponse<Void> removeBook(@org.springframework.web.bind.annotation.PathVariable("id") Long id);

    @org.springframework.web.bind.annotation.PostMapping("/api/search/init-data")
    ApiResponse<String> syncIndex();
}
