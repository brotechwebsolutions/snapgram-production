package com.snapgram.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ConversationResponse {
    private String               id;
    private List<UserResponse>   participants;
    private MessageResponse      lastMessage;
    private int                  unreadCount;
    private boolean              isPinned;
    private LocalDateTime        createdAt;
    private LocalDateTime        updatedAt;
}
