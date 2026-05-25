package com.bookland.event.dto;

import com.bookland.event.entity.Event.EventStatus;
import com.bookland.event.enums.EventType;
import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EventDTO {
    private Long id;
    private String name;
    private String description;
    private EventType type;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private EventStatus status;
    private Integer priority;
    private String createdById;
    private String createdByName;
    private LocalDateTime createdAt;
    private Boolean isActive;

    private List<EventImageDTO> images;
    private List<EventTargetDTO> targets;
    private List<EventRuleDTO> rules;
    private List<EventActionDTO> actions;
}
