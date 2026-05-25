package com.bookland.event.service;

import com.bookland.event.client.BookClient;
import com.bookland.event.client.UserClient;
import com.bookland.event.dto.*;
import com.bookland.event.dto.request.*;
import com.bookland.event.entity.*;
import com.bookland.event.entity.Event.EventStatus;
import com.bookland.event.entity.EventImage.ImageType;
import com.bookland.event.enums.EventActionType;
import com.bookland.event.enums.EventRuleType;
import com.bookland.event.enums.EventTargetType;
import com.bookland.event.enums.EventType;
import com.bookland.event.exception.AppException;
import com.bookland.event.exception.ErrorCode;
import com.bookland.event.repository.*;
import com.bookland.event.repository.specification.EventSpecification;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class EventService {

    private final EventRepository eventRepository;
    private final EventImageRepository eventImageRepository;
    private final EventTargetRepository eventTargetRepository;
    private final EventRuleRepository eventRuleRepository;
    private final EventActionRepository eventActionRepository;
    private final BookClient bookClient;
    private final UserClient userClient;

    @Transactional(readOnly = true)
    public Page<EventDTO> getAllEvents(String keyword, EventStatus status, EventType type,
                                       EventTargetType targetType, EventActionType actionType,
                                       EventRuleType ruleType, String createdById, Integer minPriority,
                                       Boolean activeOnly, LocalDateTime fromDate, LocalDateTime toDate,
                                       Pageable pageable) {
        Specification<Event> spec = Specification.where(null);

        if (keyword != null && !keyword.trim().isEmpty()) {
            spec = spec.and(EventSpecification.searchByKeyword(keyword));
        }

        if (status != null) {
            spec = spec.and(EventSpecification.hasStatus(status));
        }

        if (type != null) {
            spec = spec.and(EventSpecification.hasType(type));
        }

        if (targetType != null) {
            spec = spec.and(EventSpecification.hasTargetType(targetType));
        }

        if (actionType != null) {
            spec = spec.and(EventSpecification.hasActionType(actionType));
        }

        if (ruleType != null) {
            spec = spec.and(EventSpecification.hasRuleType(ruleType));
        }

        if (createdById != null && !createdById.trim().isEmpty()) {
            spec = spec.and(EventSpecification.hasCreator(createdById));
        }

        if (minPriority != null) {
            spec = spec.and(EventSpecification.hasPriorityGreaterThan(minPriority));
        }

        if (fromDate != null || toDate != null) {
            spec = spec.and(EventSpecification.startTimeBetween(fromDate, toDate));
        }

        if (activeOnly != null && activeOnly) {
            spec = spec.and(EventSpecification.isActiveNow());
        }

        return eventRepository.findAll(spec, pageable)
                .map(this::convertToDTO);
    }

    @Transactional(readOnly = true)
    public EventDTO getEventById(Long id) {
        Event event = eventRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.EVENT_NOT_FOUND));
        return convertToDTO(event);
    }

    @Transactional(readOnly = true)
    public EventDTO getHighestPriorityEvent() {
        LocalDateTime now = LocalDateTime.now();
        Event event = eventRepository.findFirstByStatusAndStartTimeLessThanEqualAndEndTimeGreaterThanEqualOrderByPriorityDesc(
                EventStatus.ACTIVE, now, now)
                .orElse(null);

        if (event == null) {
            return null;
        }
        return convertToDTO(event);
    }

    @Transactional
    public EventDTO createEvent(EventRequest request) {
        validateEventTime(request.getStartTime(), request.getEndTime());

        // Validate creator user
        try {
            userClient.getProfile(request.getCreatedById());
        } catch (feign.FeignException.NotFound fe) {
            throw new AppException(ErrorCode.USER_NOT_EXISTED);
        } catch (Exception e) {
            log.error("Error validating creator user", e);
            throw new AppException(ErrorCode.INTERNAL_ERROR);
        }

        // ========== VALIDATE TARGETS ==========
        if (request.getTargets() != null && !request.getTargets().isEmpty()) {
            validateEventTargets(request.getTargets());
        }

        Event event = Event.builder()
                .name(request.getName())
                .description(request.getDescription())
                .type(request.getType())
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .status(request.getStatus() != null ? request.getStatus() : EventStatus.DRAFT)
                .priority(request.getPriority() != null ? request.getPriority() : 0)
                .createdBy(request.getCreatedById())
                .build();

        Event savedEvent = eventRepository.save(event);

        // Add images
        if (request.getMainImageUrls() != null) {
            for (String imageUrl : request.getMainImageUrls()) {
                EventImage image = EventImage.builder()
                        .event(savedEvent)
                        .imageUrl(imageUrl)
                        .imageType(ImageType.MAIN)
                        .build();
                eventImageRepository.save(image);
                savedEvent.getImages().add(image);
            }
        }

        if (request.getSubImageUrls() != null) {
            for (String imageUrl : request.getSubImageUrls()) {
                EventImage image = EventImage.builder()
                        .event(savedEvent)
                        .imageUrl(imageUrl)
                        .imageType(ImageType.SUB)
                        .build();
                eventImageRepository.save(image);
                savedEvent.getImages().add(image);
            }
        }

        // Add targets
        if (request.getTargets() != null) {
            for (EventTargetRequest targetReq : request.getTargets()) {
                EventTarget target = EventTarget.builder()
                        .event(savedEvent)
                        .targetType(targetReq.getTargetType())
                        .targetId(targetReq.getTargetId())
                        .build();
                eventTargetRepository.save(target);
                savedEvent.getTargets().add(target);
            }
        }

        // Add rules
        if (request.getRules() != null) {
            for (EventRuleRequest ruleReq : request.getRules()) {
                EventRule rule = EventRule.builder()
                        .event(savedEvent)
                        .ruleType(ruleReq.getRuleType())
                        .ruleValue(ruleReq.getRuleValue())
                        .build();
                eventRuleRepository.save(rule);
                savedEvent.getRules().add(rule);
            }
        }

        // Add actions
        if (request.getActions() != null) {
            for (EventActionRequest actionReq : request.getActions()) {
                EventAction action = EventAction.builder()
                        .event(savedEvent)
                        .actionType(actionReq.getActionType())
                        .actionValue(actionReq.getActionValue())
                        .build();
                eventActionRepository.save(action);
                savedEvent.getActions().add(action);
            }
        }

        return convertToDTO(savedEvent);
    }

    // ========== VALIDATION METHOD ==========
    private void validateEventTargets(List<EventTargetRequest> targets) {
        for (EventTargetRequest target : targets) {
            try {
                switch (target.getTargetType()) {
                    case BOOK:
                        bookClient.getBookById(target.getTargetId());
                        break;
                    case CATEGORY:
                        bookClient.getCategoryById(target.getTargetId());
                        break;
                    case SERIES:
                        bookClient.getSerieById(target.getTargetId());
                        break;
                    case AUTHOR:
                        bookClient.getAuthorById(target.getTargetId());
                        break;
                    case PUBLISHER:
                        bookClient.getPublisherById(target.getTargetId());
                        break;
                    case USER:
                        userClient.getProfile(target.getTargetId().toString());
                        break;
                    case ALL:
                    case ALL_ORDERS:
                    case FIRST_ORDER:
                    case NEW_USER:
                    case VIP_USER:
                    case USER_GROUP:
                    case LOCATION:
                        // No validation needed
                        break;
                }
            } catch (feign.FeignException.NotFound fe) {
                switch (target.getTargetType()) {
                    case BOOK:
                        throw new AppException(ErrorCode.EVENT_TARGET_BOOK_NOT_FOUND);
                    case CATEGORY:
                        throw new AppException(ErrorCode.EVENT_TARGET_CATEGORY_NOT_FOUND);
                    case SERIES:
                        throw new AppException(ErrorCode.EVENT_TARGET_SERIES_NOT_FOUND);
                    case AUTHOR:
                        throw new AppException(ErrorCode.EVENT_TARGET_AUTHOR_NOT_FOUND);
                    case PUBLISHER:
                        throw new AppException(ErrorCode.EVENT_TARGET_PUBLISHER_NOT_FOUND);
                    case USER:
                        throw new AppException(ErrorCode.EVENT_TARGET_USER_NOT_FOUND);
                    default:
                        throw new AppException(ErrorCode.INTERNAL_ERROR);
                }
            } catch (Exception e) {
                log.error("Feign communication error while validating event target: Type={}, Id={}", target.getTargetType(), target.getTargetId(), e);
                throw new AppException(ErrorCode.INTERNAL_ERROR);
            }
        }
    }

    @Transactional
    public EventDTO updateEvent(Long id, EventRequest request) {
        Event event = eventRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.EVENT_NOT_FOUND));

        validateEventTime(request.getStartTime(), request.getEndTime());

        // Validate targets
        if (request.getTargets() != null && !request.getTargets().isEmpty()) {
            validateEventTargets(request.getTargets());
        }

        event.setName(request.getName());
        event.setDescription(request.getDescription());
        event.setType(request.getType());
        event.setStartTime(request.getStartTime());
        event.setEndTime(request.getEndTime());
        event.setStatus(request.getStatus() != null ? request.getStatus() : event.getStatus());
        event.setPriority(request.getPriority() != null ? request.getPriority() : event.getPriority());

        // Update creator if changed
        if (request.getCreatedById() != null &&
                (event.getCreatedBy() == null || !event.getCreatedBy().equals(request.getCreatedById()))) {
            try {
                userClient.getProfile(request.getCreatedById());
            } catch (feign.FeignException.NotFound fe) {
                throw new AppException(ErrorCode.USER_NOT_EXISTED);
            } catch (Exception e) {
                log.error("Error validating updated creator user", e);
                throw new AppException(ErrorCode.INTERNAL_ERROR);
            }
            event.setCreatedBy(request.getCreatedById());
        }

        // Update images
        event.getImages().clear();
        eventImageRepository.flush();

        if (request.getMainImageUrls() != null) {
            for (String imageUrl : request.getMainImageUrls()) {
                EventImage image = EventImage.builder()
                        .event(event)
                        .imageUrl(imageUrl)
                        .imageType(ImageType.MAIN)
                        .build();
                eventImageRepository.save(image);
                event.getImages().add(image);
            }
        }

        if (request.getSubImageUrls() != null) {
            for (String imageUrl : request.getSubImageUrls()) {
                EventImage image = EventImage.builder()
                        .event(event)
                        .imageUrl(imageUrl)
                        .imageType(ImageType.SUB)
                        .build();
                eventImageRepository.save(image);
                event.getImages().add(image);
            }
        }

        // Update targets
        event.getTargets().clear();
        eventTargetRepository.flush();

        if (request.getTargets() != null) {
            for (EventTargetRequest targetReq : request.getTargets()) {
                EventTarget target = EventTarget.builder()
                        .event(event)
                        .targetType(targetReq.getTargetType())
                        .targetId(targetReq.getTargetId())
                        .build();
                eventTargetRepository.save(target);
                event.getTargets().add(target);
            }
        }

        // Update rules
        event.getRules().clear();
        eventRuleRepository.flush();

        if (request.getRules() != null) {
            for (EventRuleRequest ruleReq : request.getRules()) {
                EventRule rule = EventRule.builder()
                        .event(event)
                        .ruleType(ruleReq.getRuleType())
                        .ruleValue(ruleReq.getRuleValue())
                        .build();
                eventRuleRepository.save(rule);
                event.getRules().add(rule);
            }
        }

        // Update actions
        event.getActions().clear();
        eventActionRepository.flush();

        if (request.getActions() != null) {
            for (EventActionRequest actionReq : request.getActions()) {
                EventAction action = EventAction.builder()
                        .event(event)
                        .actionType(actionReq.getActionType())
                        .actionValue(actionReq.getActionValue())
                        .build();
                eventActionRepository.save(action);
                event.getActions().add(action);
            }
        }

        Event updatedEvent = eventRepository.save(event);
        return convertToDTO(updatedEvent);
    }

    @Transactional
    public EventDTO updateEventStatus(Long id, EventStatus status) {
        Event event = eventRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.EVENT_NOT_FOUND));

        event.setStatus(status);
        Event updatedEvent = eventRepository.save(event);

        return convertToDTO(updatedEvent);
    }

    @Transactional
    public void deleteEvent(Long id) {
        Event event = eventRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.EVENT_NOT_FOUND));

        if (!event.getLogs().isEmpty()) {
            throw new AppException(ErrorCode.EVENT_HAS_LOGS);
        }

        eventRepository.delete(event);
    }

    private void validateEventTime(LocalDateTime startTime, LocalDateTime endTime) {
        if (startTime.isAfter(endTime)) {
            throw new AppException(ErrorCode.EVENT_INVALID_TIME);
        }
    }

    private EventDTO convertToDTO(Event event) {
        List<EventImageDTO> imageDTOs = event.getImages().stream()
                .map(img -> EventImageDTO.builder()
                        .id(img.getId())
                        .imageUrl(img.getImageUrl())
                        .imageType(img.getImageType())
                        .build())
                .collect(Collectors.toList());

        List<EventTargetDTO> targetDTOs = event.getTargets().stream()
                .map(target -> EventTargetDTO.builder()
                        .id(target.getId())
                        .targetType(target.getTargetType())
                        .targetId(target.getTargetId())
                        .build())
                .collect(Collectors.toList());

        List<EventRuleDTO> ruleDTOs = event.getRules().stream()
                .map(rule -> EventRuleDTO.builder()
                        .id(rule.getId())
                        .ruleType(rule.getRuleType())
                        .ruleValue(rule.getRuleValue())
                        .build())
                .collect(Collectors.toList());

        List<EventActionDTO> actionDTOs = event.getActions().stream()
                .map(action -> EventActionDTO.builder()
                        .id(action.getId())
                        .actionType(action.getActionType())
                        .actionValue(action.getActionValue())
                        .build())
                .collect(Collectors.toList());

        String creatorUsername = null;
        if (event.getCreatedBy() != null) {
            try {
                var response = userClient.getProfile(event.getCreatedBy());
                if (response != null && response.getResult() != null && response.getResult() instanceof java.util.Map) {
                    creatorUsername = (String) ((java.util.Map<?, ?>) response.getResult()).get("username");
                }
            } catch (Exception e) {
                log.warn("Could not retrieve creator username for user: {}", event.getCreatedBy());
            }
        }

        return EventDTO.builder()
                .id(event.getId())
                .name(event.getName())
                .description(event.getDescription())
                .type(event.getType())
                .startTime(event.getStartTime())
                .endTime(event.getEndTime())
                .status(event.getStatus())
                .priority(event.getPriority())
                .createdById(event.getCreatedBy())
                .createdByName(creatorUsername)
                .createdAt(event.getCreatedAt())
                .isActive(event.isActive())
                .images(imageDTOs)
                .targets(targetDTOs)
                .rules(ruleDTOs)
                .actions(actionDTOs)
                .build();
    }
}
