package com.bookland.order.dto.response;

import lombok.*;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BillPreviewDTO {
    private List<BookPreviewDTO> books;

    private Double originalSubtotal;      // Tổng tiền gốc (chưa event)
    private Double discountedSubtotal;    // Tổng tiền sau event
    private Double shippingCost;          // Phí ship
    private Double totalSaved;            // Tổng tiền tiết kiệm
    private Double grandTotal;            // Tổng cộng cuối cùng

    private Boolean hasEventApplied;      // Có event được áp dụng không
    private Long appliedEventId;          // ID của event được áp dụng
    private String appliedEventName;      // Tên event
    private String appliedEventType;      // Loại event (ví dụ ORDER, BOOK)
}
