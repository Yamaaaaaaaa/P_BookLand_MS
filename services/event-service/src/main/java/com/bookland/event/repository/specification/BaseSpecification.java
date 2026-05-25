package com.bookland.event.repository.specification;

import org.springframework.data.jpa.domain.Specification;

public class BaseSpecification {
    protected static <T> Specification<T> hasFieldContaining(String field, String value) {
        return (root, query, cb) -> {
            if (value == null || value.trim().isEmpty()) {
                return cb.conjunction();
            }
            return cb.like(cb.lower(root.get(field)), "%" + value.toLowerCase() + "%");
        };
    }

    protected static <T> Specification<T> hasFieldEqual(String field, Object value) {
        return (root, query, cb) -> {
            if (value == null) {
                return cb.conjunction();
            }
            return cb.equal(root.get(field), value);
        };
    }

    protected static <T> Specification<T> hasNestedFieldEqual(String parentField, String childField, Object value) {
        return (root, query, cb) -> {
            if (value == null) {
                return cb.conjunction();
            }
            return cb.equal(root.get(parentField).get(childField), value);
        };
    }
}
