package com.bookland.event.repository;

import com.bookland.event.entity.EventAction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface EventActionRepository extends JpaRepository<EventAction, Long> {
}
