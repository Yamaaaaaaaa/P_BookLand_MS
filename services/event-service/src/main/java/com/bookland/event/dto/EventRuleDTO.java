package com.bookland.event.dto;

import com.bookland.event.enums.EventRuleType;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EventRuleDTO {
    private Long id;
    private EventRuleType ruleType;
    private String ruleValue;
}
