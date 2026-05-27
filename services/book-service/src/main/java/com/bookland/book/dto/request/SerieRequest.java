package com.bookland.book.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SerieRequest {
    @NotBlank(message = "Tên bộ sách không được để trống")
    private String name;
    private String description;
}
