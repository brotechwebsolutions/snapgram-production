package com.snapgram.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class NotificationResponse {
    private String        id;
    private UserResponse  actor;
    private String        type;
    private String        entityId;
    private String        entityType;
    private String        message;
    private boolean       isRead;
    private LocalDateTime createdAt;
}
