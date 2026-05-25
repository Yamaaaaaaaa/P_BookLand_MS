package com.bookland.order.repository;

import com.bookland.order.entity.Cart;
import com.bookland.order.entity.Cart.CartStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CartRepository extends JpaRepository<Cart, Long> {

    Optional<Cart> findByUserIdAndStatus(String userId, CartStatus status);

    boolean existsByUserIdAndStatus(String userId, CartStatus status);
}
