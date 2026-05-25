package com.bookland.order.client;

import com.bookland.order.dto.response.ApiResponse;
import com.bookland.order.dto.response.BookResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestParam;

@FeignClient(name = "book-service", url = "${services.book-service.url:http://localhost:8083}")
public interface BookClient {

    @GetMapping("/api/books/{id}")
    ApiResponse<BookResponse> getBookById(@PathVariable("id") Long id);

    @PatchMapping("/api/books/{id}/stock")
    ApiResponse<BookResponse> updateBookStock(@PathVariable("id") Long id,
                                              @RequestParam("quantity") Integer quantity);
}
