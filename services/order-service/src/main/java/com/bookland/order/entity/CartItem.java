package com.bookland.order.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "cart_item",
        uniqueConstraints = @UniqueConstraint(columnNames = {"cart_id", "book_id"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CartItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cart_id", nullable = false)
    private Cart cart;

    /** Chỉ lưu bookId, không join trực tiếp vào book-service DB */
    @Column(name = "book_id", nullable = false)
    private Long bookId;

    @Column(nullable = false)
    @Builder.Default
    private Integer quantity = 1;
}
