package com.bookland.book.entity;

import lombok.*;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;
import java.util.stream.Collectors;

@Entity
@Table(name = "book")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Book {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private Double originalCost;

    @Builder.Default
    private Double sale = 0.0;

    @Builder.Default
    private Integer stock = 0;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private BookStatus status = BookStatus.ENABLE;

    private LocalDate publishedDate;

    @Column(columnDefinition = "TEXT")
    private String bookImageUrl;

    @Builder.Default
    private Boolean pin = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "authorId", nullable = false)
    private Author author;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "publisherId", nullable = false)
    private Publisher publisher;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "seriesId")
    private Serie series;

    // createdBy lưu UUID của user từ identity-service (không FK vì khác DB)
    @Column(name = "created_by")
    private String createdBy;

    @Column(updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @ManyToMany
    @JoinTable(
            name = "book_category",
            joinColumns = @JoinColumn(name = "bookId"),
            inverseJoinColumns = @JoinColumn(name = "categoryId")
    )
    @Builder.Default
    private Set<Category> categories = new HashSet<>();

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    @Transient
    public Double getFinalPrice() {
        if (sale == null || sale == 0) {
            return originalCost;
        }
        return originalCost - (originalCost * sale / 100);
    }

    public enum BookStatus {
        ENABLE, DISABLE
    }
}
