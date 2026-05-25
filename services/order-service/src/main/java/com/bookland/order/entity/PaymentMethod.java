package com.bookland.order.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "payment_method")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentMethod {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String providerCode;

    @Builder.Default
    private Boolean isOnline = false;

    @Column(columnDefinition = "TEXT")
    private String description;
}
