package com.bookland.book.repository;

import com.bookland.book.entity.BookComment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BookCommentRepository extends JpaRepository<BookComment, Long> {

    Page<BookComment> findByBookId(Long bookId, Pageable pageable);

    boolean existsByUserIdAndBookId(Long userId, Long bookId);

    @Query("SELECT AVG(bc.rating) FROM BookComment bc WHERE bc.book.id = :bookId")
    Double getAverageRatingByBookId(@Param("bookId") Long bookId);

    long countByBookId(Long bookId);

    @Query("SELECT bc.rating, COUNT(bc) FROM BookComment bc WHERE bc.book.id = :bookId GROUP BY bc.rating")
    List<Object[]> countRatingsByBookId(@Param("bookId") Long bookId);
}
