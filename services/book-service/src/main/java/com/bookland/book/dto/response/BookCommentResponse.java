package com.bookland.book.dto.response;

import lombok.*;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookCommentResponse {
    private Long id;
    private Long bookId;
    private String bookTitle;
    private Long userId;
    private String userName;
    private String userAvatar;
    private String content;
    private Integer rating;
    private LocalDateTime createdAt;
}
