package com.bookland.search.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HelloController {

    @GetMapping("/api/search/hello")
    public String hello() {
        return "Hello from Search Service!";
    }
}
