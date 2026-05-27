package com.bookland.event.repository;

import com.bookland.event.entity.EventRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface EventRuleRepository extends JpaRepository<EventRule, Long> {
}
