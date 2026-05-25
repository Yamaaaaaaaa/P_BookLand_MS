package com.bookland.order.dto.response;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShippingMethodDTO {
    private Long id;
    private String name;
    private String description;
    private Double price;
}
