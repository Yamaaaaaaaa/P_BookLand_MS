package com.bookland.book.dto.response;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SerieDTO {
    private Long id;
    private String name;
    private String description;
}
