package com.bookland.event.repository;

import com.bookland.event.entity.EventTarget;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface EventTargetRepository extends JpaRepository<EventTarget, Long> {
}
