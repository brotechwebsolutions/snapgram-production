package com.snapgram.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

/**
 * Temporary document that holds an OTP for an email BEFORE the user account
 * is created. Deleted as soon as OTP is verified.
 *
 * Flow:
 *   POST /auth/send-otp    → create/update OtpPending for the email
 *   POST /auth/verify-otp  → verify OTP → delete this, CREATE User (no password)
 *   POST /auth/set-password → user sets bcrypt password → signup complete
 */
@Document(collection = "otp_pending")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OtpPending {

    @Id
    private String id;

    /** One pending OTP per email — unique index */
    @Indexed(unique = true)
    private String email;

    /** 6-digit numeric OTP */
    private String otpCode;

    /** When the OTP expires (5 minutes from generation) */
    private LocalDateTime expiresAt;

    /** How many incorrect attempts have been made */
    @Builder.Default
    private int attempts = 0;

    /** When this record was created/updated */
    private LocalDateTime createdAt;
}
