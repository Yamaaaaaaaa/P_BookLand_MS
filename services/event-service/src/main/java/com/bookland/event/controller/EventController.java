package com.bookland.event.controller;

import com.bookland.event.dto.EventDTO;
import com.bookland.event.dto.request.EventRequest;
import com.bookland.event.dto.response.ApiResponse;
import com.bookland.event.entity.Event.EventStatus;
import com.bookland.event.enums.EventActionType;
import com.bookland.event.enums.EventRuleType;
import com.bookland.event.enums.EventTargetType;
import com.bookland.event.enums.EventType;
import com.bookland.event.service.EventService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/events")
@RequiredArgsConstructor
@SecurityRequirement(name = "BearerAuth")
@Tag(name = "Event", description = "API quản lý sự kiện và khuyến mãi")
public class EventController {

    private final EventService eventService;

    @GetMapping
    public ApiResponse<Page<EventDTO>> getAllEvents(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) EventStatus status,
            @RequestParam(required = false) EventType type,
            @RequestParam(required = false) EventTargetType targetType,
            @RequestParam(required = false) EventActionType actionType,
            @RequestParam(required = false) EventRuleType ruleType,
            @RequestParam(required = false) String createdById,
            @RequestParam(required = false) Integer minPriority,
            @RequestParam(required = false) Boolean activeOnly,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime toDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "priority") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDirection
    ) {
        Sort.Direction direction = sortDirection.equalsIgnoreCase("ASC")
                ? Sort.Direction.ASC
                : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));

        Page<EventDTO> events = eventService.getAllEvents(keyword, status, type,
                targetType, actionType, ruleType, createdById, minPriority,
                activeOnly, fromDate, toDate, pageable);
        return ApiResponse.<Page<EventDTO>>builder().result(events).build();
    }

    @GetMapping("/{id}")
    public ApiResponse<EventDTO> getEventById(@PathVariable Long id) {
        return ApiResponse.<EventDTO>builder().result(eventService.getEventById(id)).build();
    }

    @GetMapping("/highest-priority")
    public ApiResponse<EventDTO> getHighestPriorityEvent() {
        return ApiResponse.<EventDTO>builder().result(eventService.getHighestPriorityEvent()).build();
    }

    @PostMapping
    public ApiResponse<EventDTO> createEvent(@Valid @RequestBody EventRequest request) {
        return ApiResponse.<EventDTO>builder().result(eventService.createEvent(request)).build();
    }

    @PutMapping("/{id}")
    public ApiResponse<EventDTO> updateEvent(
            @PathVariable Long id,
            @Valid @RequestBody EventRequest request) {
        return ApiResponse.<EventDTO>builder().result(eventService.updateEvent(id, request)).build();
    }

    @PatchMapping("/{id}/status")
    public ApiResponse<EventDTO> updateEventStatus(
            @PathVariable Long id,
            @RequestParam EventStatus status) {
        return ApiResponse.<EventDTO>builder().result(eventService.updateEventStatus(id, status)).build();
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> deleteEvent(@PathVariable Long id) {
        eventService.deleteEvent(id);
        return ApiResponse.<Void>builder().build();
    }
}
