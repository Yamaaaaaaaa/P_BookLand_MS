package com.bookland.order.dto.request;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateBillRequest {

    @NotNull(message = "Phương thức thanh toán là bắt buộc")
    private Long paymentMethodId;

    @NotNull(message = "Phương thức vận chuyển là bắt buộc")
    private Long shippingMethodId;

    @NotEmpty(message = "Danh sách sách mua không được để trống")
    private List<BillBookRequest> books;
}
