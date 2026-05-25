package com.bookland.notification.dto.request;

import lombok.*;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SendDirectEmailRequest {
    private String to;
    private String subject;
    private String templateName;
    private Map<String, Object> templateModel;
    private String body;
}
