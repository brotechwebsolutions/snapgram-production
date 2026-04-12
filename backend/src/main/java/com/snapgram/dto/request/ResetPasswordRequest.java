package com.snapgram.dto.request;

import jakarta.validation.constraints.*;
import lombok.Data;

/**
 * UPDATED: Now uses OTP instead of UUID token.
 * Flow:
 *   1. User submits email → backend sends 6-digit OTP
 *   2. User enters OTP + new password → this DTO
 */
@Data
public class ResetPasswordRequest {

    @NotBlank(message = "Email is required")
    @Email(message = "Valid email is required")
    private String email;

    @NotBlank(message = "OTP is required")
    @Pattern(regexp = "^[0-9]{6}$", message = "OTP must be exactly 6 digits")
    private String otp;

    @NotBlank(message = "New password is required")
    @Size(min = 8, message = "Password must be at least 8 characters")
    @Pattern(
        regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).*$",
        message = "Password must contain uppercase, lowercase, and a number"
    )
    private String newPassword;
}
