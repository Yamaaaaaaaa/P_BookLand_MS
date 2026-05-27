package com.bookland.book.repository;

import com.bookland.book.entity.Book;
import com.bookland.book.entity.Book.BookStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface BookRepository extends JpaRepository<Book, Long>, JpaSpecificationExecutor<Book> {

    /**
     * Lấy sách bán chạy nhất theo số lượng bán trong khoảng thời gian,
     * có filter theo keyword, giá, danh mục, tác giả, nhà xuất bản, bộ sách.
     * Vì order-service quản lý bills, ở đây ta sort theo id DESC (mới nhất) làm proxy.
     */
    @Query("""
        SELECT b FROM Book b
        WHERE (:keyword IS NULL OR LOWER(b.name) LIKE LOWER(CONCAT('%', :keyword, '%')))
          AND (:minPrice IS NULL OR b.originalCost >= :minPrice)
          AND (:maxPrice IS NULL OR b.originalCost <= :maxPrice)
          AND (:categoryIds IS NULL OR EXISTS (
                SELECT 1 FROM b.categories c WHERE c.id IN :categoryIds
              ))
          AND (:authorIds IS NULL OR b.author.id IN :authorIds)
          AND (:publisherIds IS NULL OR b.publisher.id IN :publisherIds)
          AND (:seriesIds IS NULL OR b.series.id IN :seriesIds)
          AND b.status = 'ENABLE'
        ORDER BY b.createdAt DESC
        """)
    Page<Book> findBestSellingBooks(
            @Param("keyword") String keyword,
            @Param("minPrice") Double minPrice,
            @Param("maxPrice") Double maxPrice,
            @Param("categoryIds") List<Long> categoryIds,
            @Param("authorIds") List<Long> authorIds,
            @Param("publisherIds") List<Long> publisherIds,
            @Param("seriesIds") List<Long> seriesIds,
            Pageable pageable
    );
}
