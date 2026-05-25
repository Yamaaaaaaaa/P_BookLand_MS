package com.bookland.search.client;

import com.bookland.search.dto.ApiResponse;
import com.bookland.search.dto.BookDTO;
import com.bookland.search.dto.PageResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

@FeignClient(name = "book-service", url = "${BOOK_SERVICE_HOST:http://localhost}:8083")
public interface BookClient {

    @GetMapping("/api/books")
    ApiResponse<PageResponse<BookDTO>> getAllBooks(
            @RequestParam("page") int page,
            @RequestParam("size") int size,
            @RequestParam("dbOnly") boolean dbOnly
    );

    @GetMapping("/api/books/{id}")
    ApiResponse<BookDTO> getBookById(@org.springframework.web.bind.annotation.PathVariable("id") Long id);
}
