package com.bookland.book.client;

import com.bookland.book.dto.response.ApiResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

@FeignClient(name = "order-service", url = "${ORDER_SERVICE_HOST:http://localhost}:8084")
public interface OrderClient {

    @GetMapping("/api/bills/internal/verify-purchase")
    ApiResponse<Boolean> verifyPurchase(@RequestParam("userId") Long userId, @RequestParam("bookId") Long bookId);
}
