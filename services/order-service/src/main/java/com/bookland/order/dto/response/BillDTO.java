package com.bookland.order.dto.response;

import com.bookland.order.entity.Bill.BillStatus;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BillDTO {
    private Long id;
    private Long userId; // Long id của user
    private String userName;
    private Long paymentMethodId;
    private String paymentMethodName;
    private Long shippingMethodId;
    private String shippingMethodName;
    private Double shippingCost;
    private Double totalCost;
    private String approvedById; // approver email / username
    private String approvedByName;
    private BillStatus status;
    private List<BillBookDTO> books;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime approvedAt;
    private String paymentStatus;
}
