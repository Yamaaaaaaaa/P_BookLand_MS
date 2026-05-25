package com.bookland.notification.dto.event;

import lombok.*;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmailEvent {
    private String to;
    private String subject;
    private String templateName;
    private Map<String, Object> templateModel;
    private String body; // plaintext or html fallback if templateName is null/empty
}
