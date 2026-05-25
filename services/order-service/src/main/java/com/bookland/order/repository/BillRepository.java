package com.bookland.order.repository;

import com.bookland.order.entity.Bill;
import com.bookland.order.entity.Bill.BillStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface BillRepository extends JpaRepository<Bill, Long>, JpaSpecificationExecutor<Bill> {

    @Modifying
    @Query("UPDATE Bill b SET b.status = :status, b.updatedAt = :updatedAt WHERE b.id = :id")
    int updateStatusById(@Param("id") Long id,
                         @Param("status") BillStatus status,
                         @Param("updatedAt") LocalDateTime updatedAt);

    @Query("SELECT b FROM Bill b LEFT JOIN FETCH b.billBooks bb WHERE b.id = :id")
    Optional<Bill> findByIdWithBooks(@Param("id") Long id);
}
