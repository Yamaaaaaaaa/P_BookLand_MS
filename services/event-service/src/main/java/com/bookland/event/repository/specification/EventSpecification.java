package com.bookland.event.repository.specification;

import com.bookland.event.entity.Event;
import com.bookland.event.entity.Event.EventStatus;
import com.bookland.event.enums.EventActionType;
import com.bookland.event.enums.EventRuleType;
import com.bookland.event.enums.EventTargetType;
import com.bookland.event.enums.EventType;
import org.springframework.data.jpa.domain.Specification;
import java.time.LocalDateTime;

public class EventSpecification extends BaseSpecification {

    public static Specification<Event> searchByKeyword(String keyword) {
        return (root, query, cb) -> {
            if (keyword == null || keyword.trim().isEmpty()) {
                return cb.conjunction();
            }
            String likePattern = "%" + keyword.toLowerCase() + "%";
            return cb.or(
                    cb.like(cb.lower(root.get("name")), likePattern),
                    cb.like(cb.lower(root.get("description")), likePattern)
            );
        };
    }

    public static Specification<Event> hasStatus(EventStatus status) {
        return hasFieldEqual("status", status);
    }

    public static Specification<Event> hasType(EventType type) {
        return hasFieldEqual("type", type);
    }

    public static Specification<Event> isActiveNow() {
        return (root, query, cb) -> {
            LocalDateTime now = LocalDateTime.now();
            return cb.and(
                    cb.equal(root.get("status"), EventStatus.ACTIVE),
                    cb.lessThanOrEqualTo(root.get("startTime"), now),
                    cb.greaterThanOrEqualTo(root.get("endTime"), now)
            );
        };
    }

    public static Specification<Event> startTimeBetween(LocalDateTime from, LocalDateTime to) {
        return (root, query, cb) -> {
            if (from == null && to == null) {
                return cb.conjunction();
            }
            if (from != null && to != null) {
                return cb.between(root.get("startTime"), from, to);
            }
            if (from != null) {
                return cb.greaterThanOrEqualTo(root.get("startTime"), from);
            }
            return cb.lessThanOrEqualTo(root.get("startTime"), to);
        };
    }

    public static Specification<Event> hasTargetType(EventTargetType targetType) {
        return (root, query, cb) -> {
            if (targetType == null) {
                return cb.conjunction();
            }
            query.distinct(true);
            return cb.equal(root.join("targets").get("targetType"), targetType);
        };
    }

    public static Specification<Event> hasActionType(EventActionType actionType) {
        return (root, query, cb) -> {
            if (actionType == null) {
                return cb.conjunction();
            }
            query.distinct(true);
            return cb.equal(root.join("actions").get("actionType"), actionType);
        };
    }

    public static Specification<Event> hasRuleType(EventRuleType ruleType) {
        return (root, query, cb) -> {
            if (ruleType == null) {
                return cb.conjunction();
            }
            query.distinct(true);
            return cb.equal(root.join("rules").get("ruleType"), ruleType);
        };
    }

    public static Specification<Event> hasCreator(String createdById) {
        return hasFieldEqual("createdBy", createdById);
    }

    public static Specification<Event> hasPriorityGreaterThan(Integer minPriority) {
        return (root, query, cb) -> {
            if (minPriority == null) {
                return cb.conjunction();
            }
            return cb.greaterThanOrEqualTo(root.get("priority"), minPriority);
        };
    }
}
