package com.bookland.order.dto.response;

import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EventResponse {
    private Long id;
    private String name;
    private String description;
    private String type; // e.g., ORDER, BOOK
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private String status;
    private Integer priority;
    private String createdById;
    private String createdByName;
    private LocalDateTime createdAt;
    private Boolean isActive;

    private List<EventTargetDTO> targets;
    private List<EventRuleDTO> rules;
    private List<EventActionDTO> actions;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class EventTargetDTO {
        private Long id;
        private String targetType; // e.g., BOOK, CATEGORY, ALL
        private Long targetId;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class EventRuleDTO {
        private Long id;
        private String ruleType; // e.g., MIN_ORDER_VALUE, MIN_QUANTITY
        private String ruleValue;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class EventActionDTO {
        private Long id;
        private String actionType; // e.g., DISCOUNT_PERCENT, DISCOUNT_AMOUNT
        private String actionValue;
    }
}
