package com.bookland.order.dto.request;

import com.bookland.order.entity.Bill.BillStatus;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateBillStatusRequest {

    @NotNull(message = "Trạng thái mới là bắt buộc")
    private BillStatus status;

    private String approvedById; // optional staff username / email who approves
}
