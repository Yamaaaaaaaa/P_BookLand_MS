package com.bookland.order.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentMethodRequest {
    @NotBlank(message = "Name is required")
    private String name;

    @NotBlank(message = "Provider code is required")
    private String providerCode;

    @NotNull(message = "Is online status is required")
    private Boolean isOnline;

    private String description;
}
