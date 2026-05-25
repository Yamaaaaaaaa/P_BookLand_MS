package com.bookland.order.client;

import com.bookland.order.dto.response.ApiResponse;
import com.bookland.order.dto.response.EventResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;

@FeignClient(name = "event-service", url = "${services.event-service.url:http://localhost:8085}")
public interface EventClient {

    @GetMapping("/api/events/highest-priority")
    ApiResponse<EventResponse> getHighestPriorityEvent();
}
