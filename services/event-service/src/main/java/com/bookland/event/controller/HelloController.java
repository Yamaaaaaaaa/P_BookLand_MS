package com.bookland.event.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HelloController {

    @GetMapping("/api/events/hello")
    public String hello() {
        return "Hello from Event Service!";
    }
}
