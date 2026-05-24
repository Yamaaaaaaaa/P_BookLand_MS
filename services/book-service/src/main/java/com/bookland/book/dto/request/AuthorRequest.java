package com.bookland.book.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthorRequest {
    @NotBlank(message = "Tên tác giả không được để trống")
    private String name;
    private String description;
    private String authorImage;
}
