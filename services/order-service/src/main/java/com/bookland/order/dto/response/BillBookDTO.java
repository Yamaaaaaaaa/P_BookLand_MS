package com.bookland.order.dto.response;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BillBookDTO {
    private Long bookId;
    private String bookName;
    private String bookImageUrl;
    private Double priceSnapshot;
    private Integer quantity;
    private Double subtotal;
}
