package com.bookland.notification.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HelloController {

    @GetMapping("/api/notifications/hello")
    public String hello() {
        return "Hello from Notification Service!";
    }
}
