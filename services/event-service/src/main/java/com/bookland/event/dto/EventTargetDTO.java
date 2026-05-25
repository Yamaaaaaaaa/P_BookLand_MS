package com.bookland.event.dto;

import com.bookland.event.enums.EventTargetType;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EventTargetDTO {
    private Long id;
    private EventTargetType targetType;
    private Long targetId;
}
