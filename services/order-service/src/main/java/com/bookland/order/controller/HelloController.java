package com.bookland.order.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HelloController {

    @GetMapping("/api/carts/hello")
    public String hello() {
        return "Hello from Order Service!";
    }
}
