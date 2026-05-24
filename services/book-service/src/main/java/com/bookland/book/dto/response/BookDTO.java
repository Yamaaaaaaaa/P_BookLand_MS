package com.bookland.book.dto.response;

import com.bookland.book.entity.Book.BookStatus;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Set;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookDTO {
    private Long id;
    private String name;
    private String description;
    private Double originalCost;
    private Double sale;
    private Double finalPrice;
    private Integer stock;
    private BookStatus status;
    private LocalDate publishedDate;
    private String bookImageUrl;
    private Boolean pin;
    private Long authorId;
    private String authorName;
    private Long publisherId;
    private String publisherName;
    private Long seriesId;
    private String seriesName;
    private Set<Long> categoryIds;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
