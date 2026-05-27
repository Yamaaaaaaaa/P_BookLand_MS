package com.bookland.order.repository;

import com.bookland.order.entity.BillBook;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BillBookRepository extends JpaRepository<BillBook, Long> {

    List<BillBook> findByBillId(Long billId);

    @Query("SELECT SUM(bb.quantity) FROM BillBook bb WHERE bb.bookId = :bookId")
    Long getTotalQuantitySoldByBookId(@Param("bookId") Long bookId);
}
