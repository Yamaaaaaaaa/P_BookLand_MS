package com.bookland.event.repository;

import com.bookland.event.entity.Event;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface EventRepository extends JpaRepository<Event, Long>, JpaSpecificationExecutor<Event> {

    List<Event> findByStatus(Event.EventStatus status);

    List<Event> findByType(String type);

    @Query("SELECT e FROM Event e WHERE e.status = 'ACTIVE' " +
            "AND e.startTime <= :now AND e.endTime >= :now " +
            "ORDER BY e.priority DESC, e.startTime ASC")
    List<Event> findActiveEvents(@Param("now") LocalDateTime now);

    @Query("SELECT e FROM Event e " +
            "LEFT JOIN FETCH e.targets " +
            "LEFT JOIN FETCH e.rules " +
            "LEFT JOIN FETCH e.actions " +
            "WHERE e.id = :id")
    Optional<Event> findByIdWithDetails(@Param("id") Long id);

    @Query("SELECT e FROM Event e " +
            "JOIN e.targets t " +
            "WHERE e.status = 'ACTIVE' " +
            "AND e.startTime <= :now AND e.endTime >= :now " +
            "AND t.targetType = 'BOOK' AND t.targetId = :bookId " +
            "ORDER BY e.priority DESC")
    List<Event> findActiveEventsByBookId(@Param("bookId") Long bookId,
                                         @Param("now") LocalDateTime now);

    @Query("SELECT e FROM Event e " +
            "JOIN e.targets t " +
            "WHERE e.status = 'ACTIVE' " +
            "AND e.startTime <= :now AND e.endTime >= :now " +
            "AND t.targetType = 'CATEGORY' AND t.targetId = :categoryId " +
            "ORDER BY e.priority DESC")
    List<Event> findActiveEventsByCategoryId(@Param("categoryId") Long categoryId,
                                             @Param("now") LocalDateTime now);

    @Query("SELECT e FROM Event e WHERE e.status = 'ACTIVE' AND e.endTime < :now")
    List<Event> findExpiredEvents(@Param("now") LocalDateTime now);

    @Query("SELECT e FROM Event e WHERE e.status = 'ACTIVE' AND e.startTime > :now " +
            "ORDER BY e.startTime ASC")
    List<Event> findUpcomingEvents(@Param("now") LocalDateTime now);

    Optional<Event> findFirstByStatusAndStartTimeLessThanEqualAndEndTimeGreaterThanEqualOrderByPriorityDesc(
            Event.EventStatus status, LocalDateTime startTime, LocalDateTime endTime);
}
