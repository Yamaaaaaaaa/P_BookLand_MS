package com.bookland.book.service;

import com.bookland.book.client.OrderClient;
import com.bookland.book.client.UserClient;
import com.bookland.book.dto.request.BookCommentRequest;
import com.bookland.book.dto.response.*;
import com.bookland.book.entity.Book;
import com.bookland.book.entity.BookComment;
import com.bookland.book.exception.AppException;
import com.bookland.book.exception.ErrorCode;
import com.bookland.book.repository.BookCommentRepository;
import com.bookland.book.repository.BookRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class BookCommentService {

    private final BookCommentRepository bookCommentRepository;
    private final BookRepository bookRepository;
    private final OrderClient orderClient;
    private final UserClient userClient;

    @Transactional
    public BookCommentResponse createComment(Long userId, String email, BookCommentRequest request) {
        log.info("Creating comment for bookId={} by userId={}, email={}", request.getBookId(), userId, email);

        // 1. Check if Book exists
        Book book = bookRepository.findById(request.getBookId())
                .orElseThrow(() -> new AppException(ErrorCode.BOOK_NOT_FOUND));

        // 2. Validate one comment per book per user in microservices
        if (bookCommentRepository.existsByUserIdAndBookId(userId, book.getId())) {
            throw new AppException(ErrorCode.ALREADY_COMMENTED);
        }

        // 3. Verify user purchased the book via Feign order-service client
        try {
            ApiResponse<Boolean> verifyRes = orderClient.verifyPurchase(String.valueOf(userId), book.getId());
            if (verifyRes == null || !Boolean.TRUE.equals(verifyRes.getResult())) {
                throw new AppException(ErrorCode.BOOK_NOT_PURCHASED);
            }
        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to verify purchase with order-service", e);
            throw new AppException(ErrorCode.BOOK_NOT_PURCHASED); // fallback to strict validation rejection
        }

        // 4. Enrich userName from user-service via Feign client
        String userName = "Người dùng";
        String userAvatar = "";
        try {
            ApiResponse<UserProfileResponse> profileRes = userClient.getProfile(String.valueOf(userId));
            if (profileRes != null && profileRes.getResult() != null) {
                UserProfileResponse profile = profileRes.getResult();
                userName = profile.getUsername() != null ? profile.getUsername() 
                        : (profile.getFirstName() + " " + profile.getLastName()).trim();
            }
        } catch (Exception e) {
            log.warn("Failed to fetch user profile, using fallback userName for comment", e);
        }

        // 5. Build and save comment
        BookComment comment = BookComment.builder()
                .book(book)
                .userId(userId)
                .userName(userName)
                .userAvatar(userAvatar)
                .content(request.getContent())
                .rating(request.getRating())
                .build();

        comment = bookCommentRepository.save(comment);
        return convertToResponse(comment);
    }

    @Transactional(readOnly = true)
    public BookCommentSummaryResponse getCommentsByBook(Long bookId, Pageable pageable) {
        log.info("Fetching comments summary for bookId={}", bookId);

        Page<BookComment> commentsPage = bookCommentRepository.findByBookId(bookId, pageable);
        Double averageRating = bookCommentRepository.getAverageRatingByBookId(bookId);
        long totalComments = bookCommentRepository.countByBookId(bookId);

        List<Object[]> ratingCountsList = bookCommentRepository.countRatingsByBookId(bookId);
        Map<Integer, Integer> ratingCounts = new HashMap<>();
        for (int i = 1; i <= 5; i++) {
            ratingCounts.put(i, 0);
        }
        for (Object[] row : ratingCountsList) {
            Integer rating = (Integer) row[0];
            Long count = (Long) row[1];
            if (rating != null && rating >= 1 && rating <= 5) {
                ratingCounts.put(rating, count.intValue());
            }
        }

        PageResponse<BookCommentResponse> commentsResponse = PageResponse.from(
                commentsPage.map(this::convertToResponse)
        );

        return BookCommentSummaryResponse.builder()
                .averageRating(averageRating != null ? averageRating : 0.0)
                .totalComments(totalComments)
                .ratingCounts(ratingCounts)
                .comments(commentsResponse)
                .build();
    }

    @Transactional
    public void deleteComment(Long commentId, Long userId, String rolesHeader) {
        log.info("Deleting commentId={} by userId={}", commentId, userId);

        BookComment comment = bookCommentRepository.findById(commentId)
                .orElseThrow(() -> new AppException(ErrorCode.COMMENT_NOT_FOUND));

        boolean isAdmin = rolesHeader != null && rolesHeader.contains("ROLE_ADMIN");

        if (!comment.getUserId().equals(userId) && !isAdmin) {
            throw new AppException(ErrorCode.FORBIDDEN);
        }

        bookCommentRepository.delete(comment);
    }

    private BookCommentResponse convertToResponse(BookComment comment) {
        return BookCommentResponse.builder()
                .id(comment.getId())
                .bookId(comment.getBook().getId())
                .bookTitle(comment.getBook().getName())
                .userId(comment.getUserId())
                .userName(comment.getUserName())
                .userAvatar(comment.getUserAvatar())
                .content(comment.getContent())
                .rating(comment.getRating())
                .createdAt(comment.getCreatedAt())
                .build();
    }
}
