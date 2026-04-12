package com.snapgram.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateNoteRequest {
    @NotBlank(message = "Note content is required")
    @Size(max = 60, message = "Note cannot exceed 60 characters")
    private String content;
    private String privacy; // FOLLOWERS | CLOSE_FRIENDS | EVERYONE
}
