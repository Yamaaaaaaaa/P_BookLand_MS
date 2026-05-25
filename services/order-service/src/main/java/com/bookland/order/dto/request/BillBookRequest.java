package com.bookland.order.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BillBookRequest {

    @NotNull(message = "Mã sách không được trống")
    private Long bookId;

    @NotNull(message = "Số lượng không được trống")
    @Min(value = 1, message = "Số lượng phải ít nhất là 1")
    private Integer quantity;
}
