package com.bookland.order.repository.specification;

import com.bookland.order.entity.Bill;
import com.bookland.order.entity.Bill.BillStatus;
import org.springframework.data.jpa.domain.Specification;
import java.time.LocalDateTime;

public class BillSpecification {

    public static Specification<Bill> hasUser(Long userId) {
        return (root, query, cb) -> {
            if (userId == null) {
                return cb.conjunction();
            }
            return cb.equal(root.get("userId"), userId);
        };
    }

    public static Specification<Bill> hasStatus(BillStatus status) {
        return (root, query, cb) -> {
            if (status == null) {
                return cb.conjunction();
            }
            return cb.equal(root.get("status"), status);
        };
    }

    public static Specification<Bill> createdBetween(LocalDateTime from, LocalDateTime to) {
        return (root, query, cb) -> {
            if (from == null && to == null) {
                return cb.conjunction();
            }
            if (from != null && to != null) {
                return cb.between(root.get("createdAt"), from, to);
            }
            if (from != null) {
                return cb.greaterThanOrEqualTo(root.get("createdAt"), from);
            }
            return cb.lessThanOrEqualTo(root.get("createdAt"), to);
        };
    }

    public static Specification<Bill> totalCostBetween(Double minCost, Double maxCost) {
        return (root, query, cb) -> {
            if (minCost == null && maxCost == null) {
                return cb.conjunction();
            }
            if (minCost != null && maxCost != null) {
                return cb.between(root.get("totalCost"), minCost, maxCost);
            }
            if (minCost != null) {
                return cb.greaterThanOrEqualTo(root.get("totalCost"), minCost);
            }
            return cb.lessThanOrEqualTo(root.get("totalCost"), maxCost);
        };
    }
}
