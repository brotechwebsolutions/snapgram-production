package com.snapgram.dto.request;

import jakarta.validation.constraints.*;
import lombok.Data;

/**
 * Step 3 of signup: user sets username, full name, and password.
 *
 * This is the FINAL step of the OTP-first registration flow:
 *   Step 1: POST /auth/send-otp    → OTP emailed, no user account yet
 *   Step 2: POST /auth/verify-otp  → OTP verified, stub User created
 *   Step 3: POST /auth/set-password → username + fullName + password saved → signup complete
 *
 * After this call the user can log in.
 */
@Data
public class SetPasswordRequest {

    @NotBlank(message = "Email is required")
    @Email(message = "Please provide a valid email address")
    private String email;

    /**
     * The user-chosen username (must be unique).
     * Rules: 3-30 chars, only letters/numbers/dots/underscores, no spaces.
     * The frontend should check availability via GET /api/users/check-username/{username}
     * before submitting this form.
     */
    @NotBlank(message = "Username is required")
    @Size(min = 3, max = 30, message = "Username must be between 3 and 30 characters")
    @Pattern(
        regexp = "^[a-zA-Z0-9._]+$",
        message = "Username can only contain letters, numbers, dots, and underscores"
    )
    private String username;

    /**
     * The user's display name (full name).
     * 2-50 characters, any Unicode — names should not be overly restricted.
     */
    @NotBlank(message = "Full name is required")
    @Size(min = 2, max = 50, message = "Full name must be between 2 and 50 characters")
    private String fullName;

    @NotBlank(message = "Password is required")
    @Size(min = 8, max = 100, message = "Password must be at least 8 characters")
    @Pattern(
        regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).*$",
        message = "Password must contain at least one uppercase letter, lowercase letter, and number"
    )
    private String password;
}
