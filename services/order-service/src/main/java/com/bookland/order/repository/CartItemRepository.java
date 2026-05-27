package com.bookland.order.repository;

import com.bookland.order.entity.CartItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CartItemRepository extends JpaRepository<CartItem, Long> {

    Optional<CartItem> findByCartIdAndBookId(Long cartId, Long bookId);

    List<CartItem> findByCartIdAndBookIdIn(Long cartId, List<Long> bookIds);

    void deleteByCartId(Long cartId);
}
