package com.snapgram.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * Step 1 of signup: user sends only their email.
 * No password yet — that comes in Step 3.
 */
@Data
public class SendOtpRequest {

    @NotBlank(message = "Email is required")
    @Email(message = "Please provide a valid email address")
    private String email;
}
