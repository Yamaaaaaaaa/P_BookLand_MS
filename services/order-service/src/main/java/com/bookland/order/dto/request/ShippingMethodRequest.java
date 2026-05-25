package com.bookland.order.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShippingMethodRequest {

    @NotBlank(message = "Tên phương thức vận chuyển không được để trống")
    private String name;

    private String description;

    @NotNull(message = "Giá vận chuyển không được để trống")
    @Min(value = 0, message = "Giá vận chuyển phải >= 0")
    private Double price;
}
