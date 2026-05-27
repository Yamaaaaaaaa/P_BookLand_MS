package com.bookland.event.entity;

import com.bookland.event.enums.EventTargetType;
import lombok.*;
import jakarta.persistence.*;

@Entity
@Table(name = "event_target")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EventTarget {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "eventId", nullable = false)
    private Event event;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EventTargetType targetType;

    @Column(nullable = false)
    private Long targetId;
}
