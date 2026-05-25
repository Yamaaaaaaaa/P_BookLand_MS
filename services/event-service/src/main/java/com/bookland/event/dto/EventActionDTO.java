package com.bookland.event.dto;

import com.bookland.event.enums.EventActionType;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EventActionDTO {
    private Long id;
    private EventActionType actionType;
    private String actionValue;
}
