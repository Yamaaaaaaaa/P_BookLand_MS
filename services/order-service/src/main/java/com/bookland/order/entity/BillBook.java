package com.bookland.order.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "bill_book")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BillBook {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bill_id", nullable = false)
    private Bill bill;

    @Column(name = "book_id", nullable = false)
    private Long bookId;

    @Column(name = "price_snapshot", nullable = false)
    private Double priceSnapshot;

    @Column(nullable = false)
    private Integer quantity;
}
