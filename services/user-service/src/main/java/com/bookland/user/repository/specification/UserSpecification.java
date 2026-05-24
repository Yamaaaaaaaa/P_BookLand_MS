package com.bookland.user.repository.specification;

import com.bookland.user.entity.User;
import com.bookland.user.entity.User.UserStatus;
import org.springframework.data.jpa.domain.Specification;

public class UserSpecification extends BaseSpecification {

    public static Specification<User> searchByKeyword(String keyword) {
        return (root, query, cb) -> {
            if (keyword == null || keyword.trim().isEmpty()) {
                return cb.conjunction();
            }
            String likePattern = "%" + keyword.toLowerCase() + "%";
            return cb.or(
                    cb.like(cb.lower(root.get("username")), likePattern),
                    cb.like(cb.lower(root.get("email")), likePattern),
                    cb.like(cb.lower(root.get("firstName")), likePattern),
                    cb.like(cb.lower(root.get("lastName")), likePattern),
                    cb.like(cb.lower(root.get("phone")), likePattern)
            );
        };
    }

    public static Specification<User> hasStatus(UserStatus status) {
        return hasFieldEqual("status", status);
    }

    public static Specification<User> hasRole(Long roleId) {
        return (root, query, cb) -> {
            if (roleId == null) {
                return cb.conjunction();
            }
            return cb.equal(root.join("roles").get("id"), roleId);
        };
    }
}
