package com.bookland.book.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookCommentRequest {

    @NotNull(message = "Bắt buộc có bookId")
    private Long bookId;

    @NotBlank(message = "Nội dung bình luận không được để trống")
    private String content;

    @NotNull(message = "Bắt buộc có đánh giá số sao")
    @Min(value = 1, message = "Số sao tối thiểu là 1")
    @Max(value = 5, message = "Số sao tối đa là 5")
    private Integer rating;
}
