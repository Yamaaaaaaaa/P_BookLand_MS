package com.bookland.event.dto;

import com.bookland.event.entity.EventImage;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EventImageDTO {
    private Long id;
    private String imageUrl;
    private EventImage.ImageType imageType;
}
