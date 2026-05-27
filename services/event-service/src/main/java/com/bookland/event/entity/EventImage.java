package com.bookland.event.entity;

import lombok.*;
import jakarta.persistence.*;

@Entity
@Table(name = "event_image")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EventImage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "eventId", nullable = false)
    private Event event;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String imageUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private ImageType imageType = ImageType.SUB;

    public enum ImageType {
        MAIN, SUB
    }
}
