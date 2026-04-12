package com.snapgram.service;

import com.snapgram.dto.request.*;
import com.snapgram.dto.response.AuthResponse;
import com.snapgram.dto.response.UserResponse;
import com.snapgram.exception.*;
import com.snapgram.model.LoginHistory;
import com.snapgram.model.OtpPending;
import com.snapgram.model.User;
import com.snapgram.repository.LoginHistoryRepository;
import com.snapgram.repository.OtpPendingRepository;
import com.snapgram.repository.UserRepository;
import com.snapgram.security.jwt.JwtUtils;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * AuthService — complete authentication service.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * SIGNUP FLOW (OTP-first, Instagram-like):
 * ══════════════════════════════════════════════════════════════════════════
 *
 *   Step 1 — POST /api/auth/send-otp     { email }
 *     → Generates 6-digit OTP, stores in otp_pending, sends email.
 *     → NO user account created yet.
 *     → If email already has a complete verified account → reject.
 *     → 60-second resend cooldown enforced.
 *
 *   Step 2 — POST /api/auth/verify-otp   { email, otp }
 *     → Verifies OTP against otp_pending.
 *     → On success: deletes OtpPending, creates a STUB User
 *       (emailVerified=true, password=null, username=placeholder).
 *     → Returns userId.
 *
 *   Step 3 — POST /api/auth/set-password  { email, username, fullName, password }
 *     → Sets username (must be unique), fullName, and bcrypt password.
 *     → Signup is now FULLY COMPLETE — user can log in.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * LOGIN:   POST /api/auth/login   { usernameOrEmail, password }
 * ══════════════════════════════════════════════════════════════════════════
 *
 * ══════════════════════════════════════════════════════════════════════════
 * PASSWORD RESET (dual mode):
 * ══════════════════════════════════════════════════════════════════════════
 *   Mode A (Link):  POST /auth/forgot-password/link  →  POST /auth/reset-password/link
 *   Mode B (OTP):   POST /auth/forgot-password  →  POST /auth/reset-password
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository           userRepository;
    private final OtpPendingRepository     otpPendingRepository;
    private final LoginHistoryRepository   loginHistoryRepository;
    private final PasswordEncoder          passwordEncoder;
    private final JwtUtils                 jwtUtils;
    private final AuthenticationManager    authenticationManager;
    private final EmailService             emailService;

    private static final SecureRandom SECURE_RANDOM           = new SecureRandom();
    private static final int          OTP_EXPIRY_MINS         = 5;
    private static final int          PASSWORD_RESET_OTP_MINS = 10;
    private static final int          MAX_OTP_ATTEMPTS        = 5;
    private static final int          RESEND_COOLDOWN_SECS    = 60;

    @Value("${app.email-verification.token-expiry-hours:24}")
    private int emailVerificationTokenExpiryHours;

    @Value("${app.password-reset.token-expiry-minutes}")
    private int passwordResetTokenExpiryMinutes;

    @Value("${app.security.max-failed-attempts}")
    private int maxFailedAttempts;

    @Value("${app.security.lock-duration-minutes}")
    private int lockDurationMinutes;

    // ════════════════════════════════════════════════════════════════════════
    // SIGNUP STEP 1 — SEND OTP
    // ════════════════════════════════════════════════════════════════════════

    /**
     * Generates and emails a 6-digit OTP. No user is created yet.
     *
     * Security rules:
     *   - Complete account (verified + password set) → reject (already exists)
     *   - Incomplete account (email verified, no password) → delete + allow restart
     *   - OTP requested < 60 seconds ago → throttle
     */
    public void sendOtp(SendOtpRequest request) {
        String email = request.getEmail().toLowerCase().trim();

        // Reject if a fully complete account already exists
        userRepository.findByEmail(email).ifPresent(u -> {
            if (u.isEmailVerified() && u.getPassword() != null) {
                throw new ConflictException("An account with this email already exists. Please log in.");
            }
            // Incomplete account — clear it so user can restart
            log.info("Clearing incomplete account for OTP restart: {}", email);
            userRepository.delete(u);
        });

        // 60-second resend cooldown
        otpPendingRepository.findByEmail(email).ifPresent(pending -> {
            long secondsSince = Duration.between(pending.getCreatedAt(), LocalDateTime.now()).getSeconds();
            if (secondsSince < RESEND_COOLDOWN_SECS) {
                long wait = RESEND_COOLDOWN_SECS - secondsSince;
                throw new BadRequestException("Please wait " + wait + " seconds before requesting another OTP.");
            }
        });

        String otp = generateOtp();
        otpPendingRepository.deleteByEmail(email);
        otpPendingRepository.save(OtpPending.builder()
                .email(email)
                .otpCode(otp)
                .expiresAt(LocalDateTime.now().plusMinutes(OTP_EXPIRY_MINS))
                .attempts(0)
                .createdAt(LocalDateTime.now())
                .build());

        emailService.sendOtpEmail(email, email.split("@")[0], otp);
        log.info("Signup OTP sent to: {}", email);
    }

    // ════════════════════════════════════════════════════════════════════════
    // SIGNUP STEP 2 — VERIFY OTP → CREATE STUB USER
    // ════════════════════════════════════════════════════════════════════════

    /**
     * Verifies the OTP. On success:
     *   1. Deletes OtpPending (one-time use)
     *   2. Creates a STUB User: emailVerified=true, password=null,
     *      username=temporary-placeholder (overwritten in step 3)
     *   3. Returns the userId so the frontend can track the session
     *
     * The user CANNOT log in yet — password is null and username is a placeholder.
     */
    public String verifySignupOtp(VerifySignupOtpRequest request) {
        String email = request.getEmail().toLowerCase().trim();
        String otp   = request.getOtp().trim();

        OtpPending pending = otpPendingRepository.findByEmail(email)
                .orElseThrow(() -> new BadRequestException(
                        "No pending OTP found for this email. Please request a new one."));

        if (pending.getExpiresAt().isBefore(LocalDateTime.now())) {
            otpPendingRepository.deleteByEmail(email);
            throw new BadRequestException("OTP has expired. Please request a new one.");
        }
        if (pending.getAttempts() >= MAX_OTP_ATTEMPTS) {
            otpPendingRepository.deleteByEmail(email);
            throw new BadRequestException("Too many incorrect attempts. Please request a new OTP.");
        }
        if (!pending.getOtpCode().equals(otp)) {
            pending.setAttempts(pending.getAttempts() + 1);
            otpPendingRepository.save(pending);
            int remaining = MAX_OTP_ATTEMPTS - pending.getAttempts();
            if (remaining <= 0) {
                otpPendingRepository.deleteByEmail(email);
                throw new BadRequestException("Too many incorrect attempts. Please request a new OTP.");
            }
            throw new BadRequestException("Incorrect OTP. " + remaining + " attempt(s) remaining.");
        }

        // ✅ OTP correct — delete it
        otpPendingRepository.deleteByEmail(email);

        // Create stub user (email verified, no username/password yet — set in step 3)
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            // Temporary unique username — will be overwritten in step 3
            String tempUsername = "user_" + UUID.randomUUID().toString().replace("-", "").substring(0, 10);
            user = User.builder()
                    .email(email)
                    .username(tempUsername)
                    .fullName("")          // empty placeholder
                    .role("USER")
                    .emailVerified(true)
                    .build();
            userRepository.save(user);
            log.info("Stub user created after OTP verification: {} → id={}", email, user.getId());
        } else {
            user.setEmailVerified(true);
            userRepository.save(user);
        }

        return user.getId();
    }

    // ════════════════════════════════════════════════════════════════════════
    // SIGNUP STEP 3 — SET USERNAME + FULLNAME + PASSWORD
    // ════════════════════════════════════════════════════════════════════════

    /**
     * Completes signup by setting the user's chosen username, full name, and password.
     *
     * Validation:
     *   - User must exist and be email-verified (done in step 2)
     *   - Password must NOT already be set
     *   - Chosen username must not be taken by another account
     *     (the stub user in step 2 got a temp username — this replaces it)
     */
    public AuthResponse setPassword(SetPasswordRequest request) {
        String email    = request.getEmail().toLowerCase().trim();
        String username = request.getUsername().toLowerCase().trim();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BadRequestException(
                        "Account not found. Please start the signup process again."));

        if (!user.isEmailVerified()) {
            throw new BadRequestException("Email not verified. Please complete OTP verification first.");
        }
        if (user.getPassword() != null) {
            throw new BadRequestException("Account setup already complete. Please log in.");
        }

        // Check username availability (excluding this user's own temp username)
        userRepository.findByUsername(username).ifPresent(existing -> {
            if (!existing.getId().equals(user.getId())) {
                throw new ConflictException("The username '@" + username + "' is already taken. Please choose another.");
            }
        });

        // Save all three fields atomically
        user.setUsername(username);
        user.setFullName(request.getFullName().trim());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        userRepository.save(user);
        log.info("Signup complete for: {} (@{})", email, username);

        // Send welcome email
        emailService.sendWelcomeEmail(email, username);

        // Auto-login: generate JWT so the user lands directly on the home feed
        String accessToken  = jwtUtils.generateAccessToken(user.getId(), user.getUsername());
        String refreshToken = jwtUtils.generateRefreshToken(user.getId());

        user.setOnline(true);
        user.setLastSeen(LocalDateTime.now());
        userRepository.save(user);

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .user(toUserResponse(user))
                .build();
    }

    // ════════════════════════════════════════════════════════════════════════
    // LOGIN
    // ════════════════════════════════════════════════════════════════════════

    public AuthResponse login(LoginRequest request, HttpServletRequest httpRequest) {
        String identifier = request.getUsernameOrEmail().toLowerCase().trim();

        User user = userRepository.findByEmail(identifier)
                .or(() -> userRepository.findByUsername(identifier))
                .orElseThrow(() -> new BadCredentialsException("Invalid credentials"));

        if (user.isAccountLocked()) {
            if (user.getLockedUntil() != null && user.getLockedUntil().isAfter(LocalDateTime.now())) {
                throw new LockedException("Account locked until " + user.getLockedUntil().toLocalTime()
                        + ". Please try again later or reset your password.");
            }
            user.setAccountLocked(false);
            user.setFailedLoginAttempts(0);
            user.setLockedUntil(null);
            userRepository.save(user);
        }

        if (!user.isEmailVerified()) {
            throw new ForbiddenException("EMAIL_NOT_VERIFIED:Please verify your email first.");
        }
        if (user.getPassword() == null) {
            throw new ForbiddenException("PASSWORD_NOT_SET:Please complete signup by setting your password.");
        }

        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(user.getEmail(), request.getPassword()));
        } catch (BadCredentialsException e) {
            handleFailedLogin(user);
            throw new BadCredentialsException("Invalid credentials");
        }

        if (user.getFailedLoginAttempts() > 0) {
            user.setFailedLoginAttempts(0);
            userRepository.save(user);
        }

        String accessToken  = jwtUtils.generateAccessToken(user.getId(), user.getUsername());
        String refreshToken = jwtUtils.generateRefreshToken(user.getId());

        user.setOnline(true);
        user.setLastSeen(LocalDateTime.now());
        userRepository.save(user);
        recordLoginHistory(user.getId(), httpRequest, accessToken);

        log.info("Login: {}", user.getEmail());
        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .user(toUserResponse(user))
                .build();
    }

    // ════════════════════════════════════════════════════════════════════════
    // LOGOUT
    // ════════════════════════════════════════════════════════════════════════

    public void logout(String userId, String token) {
        userRepository.findById(userId).ifPresent(u -> {
            u.setOnline(false);
            u.setLastSeen(LocalDateTime.now());
            userRepository.save(u);
        });
        if (token != null) {
            loginHistoryRepository.findBySessionToken(token).ifPresent(h -> {
                h.setActive(false);
                h.setLogoutAt(LocalDateTime.now());
                loginHistoryRepository.save(h);
            });
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    // PASSWORD RESET — MODE A: EMAIL LINK
    // ════════════════════════════════════════════════════════════════════════

    public void forgotPasswordLink(ForgotPasswordRequest request) {
        userRepository.findByEmail(request.getEmail().toLowerCase().trim()).ifPresent(user -> {
            if (user.getPassword() == null) return;
            String token = UUID.randomUUID().toString();
            user.setPasswordResetToken(token);
            user.setPasswordResetTokenExpiry(LocalDateTime.now().plusMinutes(passwordResetTokenExpiryMinutes));
            userRepository.save(user);
            emailService.sendPasswordResetEmail(user.getEmail(), user.getUsername(), token);
        });
    }

    public void resetPasswordLink(ResetPasswordLinkRequest request) {
        User user = userRepository.findByPasswordResetToken(request.getToken())
                .orElseThrow(() -> new BadRequestException("This reset link is invalid. Please request a new one."));

        if (user.getPasswordResetTokenExpiry() == null
                || user.getPasswordResetTokenExpiry().isBefore(LocalDateTime.now())) {
            throw new BadRequestException("This reset link has expired. Please request a new one.");
        }
        if (user.getPassword() != null && passwordEncoder.matches(request.getNewPassword(), user.getPassword())) {
            throw new BadRequestException("New password must be different from your current password.");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        user.setPasswordResetToken(null);
        user.setPasswordResetTokenExpiry(null);
        user.setAccountLocked(false);
        user.setFailedLoginAttempts(0);
        userRepository.save(user);
    }

    // ════════════════════════════════════════════════════════════════════════
    // PASSWORD RESET — MODE B: OTP
    // ════════════════════════════════════════════════════════════════════════

    public void forgotPassword(ForgotPasswordRequest request) {
        userRepository.findByEmail(request.getEmail().toLowerCase().trim()).ifPresent(user -> {
            if (user.getPassword() == null) return;
            String otp = generateOtp();
            user.setPasswordResetOtp(otp);
            user.setPasswordResetOtpExpiry(LocalDateTime.now().plusMinutes(PASSWORD_RESET_OTP_MINS));
            user.setPasswordResetOtpAttempts(0);
            userRepository.save(user);
            emailService.sendPasswordResetOtpEmail(user.getEmail(), user.getUsername(), otp);
        });
    }

    public void resendPasswordResetOtp(String email) {
        if (email == null || email.isBlank()) throw new BadRequestException("Email is required.");
        userRepository.findByEmail(email.toLowerCase().trim()).ifPresent(user -> {
            if (user.getPassword() == null) return;
            if (user.getPasswordResetOtpExpiry() != null
                    && user.getPasswordResetOtpExpiry().isAfter(
                        LocalDateTime.now().plusSeconds(PASSWORD_RESET_OTP_MINS * 60L - RESEND_COOLDOWN_SECS))) {
                throw new BadRequestException("Please wait 60 seconds before requesting another code.");
            }
            String otp = generateOtp();
            user.setPasswordResetOtp(otp);
            user.setPasswordResetOtpExpiry(LocalDateTime.now().plusMinutes(PASSWORD_RESET_OTP_MINS));
            user.setPasswordResetOtpAttempts(0);
            userRepository.save(user);
            emailService.sendPasswordResetOtpEmail(user.getEmail(), user.getUsername(), otp);
        });
    }

    public void resetPassword(ResetPasswordRequest request) {
        String email = request.getEmail().toLowerCase().trim();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BadRequestException("No account found for this email."));

        if (user.getPasswordResetOtp() == null || user.getPasswordResetOtpExpiry() == null) {
            throw new BadRequestException("No active reset code. Please request a new one.");
        }
        if (user.getPasswordResetOtpExpiry().isBefore(LocalDateTime.now())) {
            throw new BadRequestException("Reset code has expired. Please request a new one.");
        }
        if (user.getPasswordResetOtpAttempts() >= MAX_OTP_ATTEMPTS) {
            throw new BadRequestException("Too many incorrect attempts. Please request a new reset code.");
        }
        if (!user.getPasswordResetOtp().equals(request.getOtp().trim())) {
            user.setPasswordResetOtpAttempts(user.getPasswordResetOtpAttempts() + 1);
            userRepository.save(user);
            int remaining = MAX_OTP_ATTEMPTS - user.getPasswordResetOtpAttempts();
            if (remaining <= 0) throw new BadRequestException("Too many incorrect attempts. Please request a new reset code.");
            throw new BadRequestException("Incorrect code. " + remaining + " attempt(s) remaining.");
        }
        if (user.getPassword() != null && passwordEncoder.matches(request.getNewPassword(), user.getPassword())) {
            throw new BadRequestException("New password must be different from your current password.");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        user.setPasswordResetOtp(null);
        user.setPasswordResetOtpExpiry(null);
        user.setPasswordResetOtpAttempts(0);
        user.setPasswordResetToken(null);
        user.setPasswordResetTokenExpiry(null);
        user.setAccountLocked(false);
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        userRepository.save(user);
    }

    // ════════════════════════════════════════════════════════════════════════
    // CHANGE PASSWORD (authenticated user)
    // ════════════════════════════════════════════════════════════════════════

    public void changePassword(String userId, ChangePasswordRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        if (user.getPassword() == null) {
            throw new BadRequestException("No password set. Please use 'Set Password' to create one.");
        }
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new BadRequestException("Current password is incorrect.");
        }
        if (passwordEncoder.matches(request.getNewPassword(), user.getPassword())) {
            throw new BadRequestException("New password must be different from your current password.");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }

    // ════════════════════════════════════════════════════════════════════════
    // LEGACY (backward compat)
    // ════════════════════════════════════════════════════════════════════════

    public void verifyEmail(String token) {
        if (token == null || token.isBlank()) {
            throw new BadRequestException("Verification token is required.");
        }
        User user = userRepository.findByEmailVerificationToken(token)
                .orElseThrow(() -> new BadRequestException("Invalid or expired verification link."));

        if (user.getEmailVerificationTokenExpiry() != null
                && user.getEmailVerificationTokenExpiry().isBefore(LocalDateTime.now())) {
            throw new BadRequestException("Verification link has expired.");
        }
        if (user.isEmailVerified()) return;

        user.setEmailVerified(true);
        user.setEmailVerificationToken(null);
        user.setEmailVerificationTokenExpiry(null);
        userRepository.save(user);
        emailService.sendWelcomeEmail(user.getEmail(), user.getUsername());
    }

    public void resendVerificationEmail(String email) {
        if (email == null || email.isBlank()) throw new BadRequestException("Email is required.");
        SendOtpRequest req = new SendOtpRequest();
        req.setEmail(email);
        sendOtp(req);
    }

    // ════════════════════════════════════════════════════════════════════════
    // PRIVATE HELPERS
    // ════════════════════════════════════════════════════════════════════════

    private String generateOtp() {
        return String.format("%06d", SECURE_RANDOM.nextInt(1_000_000));
    }

    private void handleFailedLogin(User user) {
        int attempts = user.getFailedLoginAttempts() + 1;
        user.setFailedLoginAttempts(attempts);
        if (attempts >= maxFailedAttempts) {
            user.setAccountLocked(true);
            user.setLockedUntil(LocalDateTime.now().plusMinutes(lockDurationMinutes));
            log.warn("Account locked after {} failed attempts: {}", attempts, user.getEmail());
        }
        userRepository.save(user);
    }

    private void recordLoginHistory(String userId, HttpServletRequest req, String token) {
        String ip = getClientIp(req);
        String ua = req.getHeader("User-Agent");
        loginHistoryRepository.save(LoginHistory.builder()
                .userId(userId)
                .ipAddress(ip)
                .userAgent(ua != null ? ua.substring(0, Math.min(ua.length(), 200)) : "Unknown")
                .sessionToken(token)
                .active(true)
                .build());
    }

    private String getClientIp(HttpServletRequest req) {
        String xff = req.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) return xff.split(",")[0].trim();
        String realIp = req.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) return realIp.trim();
        return req.getRemoteAddr();
    }

    private UserResponse toUserResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .bio(user.getBio())
                .profilePictureUrl(user.getProfilePictureUrl())
                .coverPhotoUrl(user.getCoverPhotoUrl())
                .website(user.getWebsite())
                .emailVerified(user.isEmailVerified())
                .isPrivate(user.isPrivateAccount())
                .isOnline(user.isOnline())
                .followerCount(user.getFollowerCount())
                .followingCount(user.getFollowingCount())
                .lastSeen(user.getLastSeen())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
