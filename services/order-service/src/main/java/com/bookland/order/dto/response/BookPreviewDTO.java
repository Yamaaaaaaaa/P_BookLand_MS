package com.bookland.order.dto.response;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookPreviewDTO {
    private Long bookId;
    private String bookName;
    private String bookImageUrl;
    private Double originalPrice;         // Giá gốc của book
    private Double eventDiscountedPrice;  // Giá sau khi áp dụng event
    private Double finalPrice;            // Giá cuối cùng
    private Integer quantity;
    private Double subtotal;
    private Boolean hasEventDiscount;     // Có được giảm giá từ event không
}
