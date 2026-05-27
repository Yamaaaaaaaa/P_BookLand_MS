package com.bookland.event.client;

import com.bookland.event.dto.response.ApiResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "book-service", url = "${services.book-service.url:http://localhost:8083}")
public interface BookClient {

    @GetMapping("/api/books/{id}")
    ApiResponse<Object> getBookById(@PathVariable("id") Long id);

    @GetMapping("/api/categories/{id}")
    ApiResponse<Object> getCategoryById(@PathVariable("id") Long id);

    @GetMapping("/api/series/{id}")
    ApiResponse<Object> getSerieById(@PathVariable("id") Long id);

    @GetMapping("/api/authors/{id}")
    ApiResponse<Object> getAuthorById(@PathVariable("id") Long id);

    @GetMapping("/api/publishers/{id}")
    ApiResponse<Object> getPublisherById(@PathVariable("id") Long id);
}
