package com.bookland.order.repository;

import com.bookland.order.entity.ShippingMethod;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface ShippingMethodRepository extends JpaRepository<ShippingMethod, Long>, JpaSpecificationExecutor<ShippingMethod> {
}
