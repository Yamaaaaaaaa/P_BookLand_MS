package com.bookland.order.dto.response;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CartItemDTO {
    private Long id;
    private Long bookId;
    private String bookName;
    private String bookImageUrl;
    private Double originalPrice;
    private Double salePercent;
    private Double finalPrice;
    private Integer quantity;
    private Integer availableStock;
    private Double subtotal;
}
