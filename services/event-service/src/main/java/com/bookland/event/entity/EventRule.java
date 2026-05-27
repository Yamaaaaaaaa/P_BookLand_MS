package com.bookland.event.entity;

import com.bookland.event.enums.EventRuleType;
import lombok.*;
import jakarta.persistence.*;

@Entity
@Table(name = "event_rule")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EventRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "eventId", nullable = false)
    private Event event;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EventRuleType ruleType;

    @Column(nullable = false)
    private String ruleValue;
}
