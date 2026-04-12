package com.snapgram.dto.request;

import jakarta.validation.constraints.*;
import lombok.Data;

/**
 * Used for Mode A password reset (UUID link flow).
 * The user clicked the email link which contains ?token=xxx,
 * then submits this DTO with the token + new password.
 */
@Data
public class ResetPasswordLinkRequest {

    @NotBlank(message = "Reset token is required")
    private String token;

    @NotBlank(message = "New password is required")
    @Size(min = 8, message = "Password must be at least 8 characters")
    @Pattern(
        regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).*$",
        message = "Password must contain uppercase, lowercase, and a number"
    )
    private String newPassword;
}
