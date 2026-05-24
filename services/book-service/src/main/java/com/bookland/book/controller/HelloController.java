package com.bookland.book.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HelloController {

    @GetMapping("/api/books/hello")
    public String hello() {
        return "Hello from Book Service!";
    }
}
