package com.bookland.event.dto.request;

import com.bookland.event.entity.Event.EventStatus;
import com.bookland.event.enums.EventType;
import jakarta.validation.constraints.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EventRequest {

    @NotBlank(message = "Tên sự kiện không được để trống")
    private String name;

    private String description;

    @NotNull(message = "Loại sự kiện không được để trống")
    private EventType type;

    @NotNull(message = "Thời gian bắt đầu không được để trống")
    private LocalDateTime startTime;

    @NotNull(message = "Thời gian kết thúc không được để trống")
    private LocalDateTime endTime;

    private EventStatus status;

    @Min(value = 0, message = "Độ ưu tiên phải >= 0")
    private Integer priority;

    @NotBlank(message = "ID người tạo không được để trống")
    private String createdById;

    private List<String> mainImageUrls;
    private List<String> subImageUrls;
    private List<EventTargetRequest> targets;
    private List<EventRuleRequest> rules;
    private List<EventActionRequest> actions;
}
