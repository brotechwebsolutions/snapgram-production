package com.snapgram.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class SendMessageRequest {
    @NotBlank(message = "Recipient ID is required")
    private String recipientId;
    private String content;
    private String messageType; // TEXT | IMAGE | VOICE | POST_SHARE
    private String sharedPostId;
}
