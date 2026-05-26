package com.bookland.order.client;

import com.bookland.order.dto.response.ApiResponse;
import com.bookland.order.dto.response.UserProfileResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;

@FeignClient(name = "user-service", url = "${services.user-service.url:http://localhost:8082}")
public interface UserClient {

    /**
     * Tra cứu user profile theo Long id (identity-service PK).
     * Dùng để enrich userName khi hiển thị BillDTO.
     */
    @GetMapping("/internal/users/{userId}")
    ApiResponse<UserProfileResponse> getProfile(@PathVariable("userId") Long userId);
}
