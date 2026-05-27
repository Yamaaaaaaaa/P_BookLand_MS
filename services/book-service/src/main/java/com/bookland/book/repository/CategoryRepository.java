package com.bookland.book.repository;

import com.bookland.book.entity.Category;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CategoryRepository extends JpaRepository<Category, Long> {
    Optional<Category> findByName(String name);
    boolean existsByName(String name);

    @Query("SELECT c FROM Category c WHERE " +
           "(:keyword IS NULL OR LOWER(c.name) LIKE LOWER(CONCAT('%', :keyword, '%'))) AND " +
           "(:pinned IS NULL OR c.pin = :pinned)")
    Page<Category> searchByKeywordAndPin(
            @Param("keyword") String keyword,
            @Param("pinned") Boolean pinned,
            Pageable pageable);
}
