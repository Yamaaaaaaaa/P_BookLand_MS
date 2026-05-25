package com.bookland.event.dto.request;

import com.bookland.event.enums.EventTargetType;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EventTargetRequest {

    @NotNull(message = "Target type không được để trống")
    private EventTargetType targetType;

    @NotNull(message = "Target ID không được để trống")
    private Long targetId;
}
