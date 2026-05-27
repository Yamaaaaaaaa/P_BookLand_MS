package com.bookland.event.entity;

import com.bookland.event.enums.EventActionType;
import lombok.*;
import jakarta.persistence.*;

@Entity
@Table(name = "event_action")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EventAction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "eventId", nullable = false)
    private Event event;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EventActionType actionType;

    @Column(nullable = false)
    private String actionValue;
}
