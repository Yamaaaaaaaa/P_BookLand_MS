package com.bookland.book.dto.response;

import lombok.*;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookCommentSummaryResponse {
    private Double averageRating;
    private long totalComments;
    private Map<Integer, Integer> ratingCounts;
    private PageResponse<BookCommentResponse> comments;
}
