package com.bookland.book.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PublisherRequest {
    @NotBlank(message = "Tên nhà xuất bản không được để trống")
    private String name;
    private String description;
}
