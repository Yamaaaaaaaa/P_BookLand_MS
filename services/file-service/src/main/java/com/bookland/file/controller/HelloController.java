package com.bookland.file.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HelloController {

    @GetMapping("/api/files/hello")
    public String hello() {
        return "Hello from File Service!";
    }
}
