package com.bookland.order.dto.response;

import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Set;

/**
 * DTO nhận dữ liệu sách từ book-service qua Feign.
 * Chỉ map các field cần thiết cho Cart/Order.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookResponse {
    private Long id;
    private String name;
    private String bookImageUrl;
    private Double originalCost;
    private Double sale;
    private Double finalPrice;
    private Integer stock;
    private String status;
}
