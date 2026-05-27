package com.bookland.book.dto.request;

import com.bookland.book.entity.Book.BookStatus;
import jakarta.validation.constraints.*;
import lombok.*;

import java.time.LocalDate;
import java.util.Set;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookRequest {
    @NotBlank(message = "Tên sách không được để trống")
    private String name;

    private String description;

    @NotNull(message = "Giá gốc không được để trống")
    @Positive(message = "Giá gốc phải lớn hơn 0")
    private Double originalCost;

    @Min(value = 0, message = "Giảm giá phải >= 0")
    @Max(value = 100, message = "Giảm giá phải <= 100")
    private Double sale;

    @Min(value = 0, message = "Số lượng phải >= 0")
    private Integer stock;

    private BookStatus status;
    private LocalDate publishedDate;
    private String bookImageUrl;
    private Boolean pin;

    @NotNull(message = "Tác giả không được để trống")
    private Long authorId;

    @NotNull(message = "Nhà xuất bản không được để trống")
    private Long publisherId;

    private Long seriesId;
    private Set<Long> categoryIds;
}
