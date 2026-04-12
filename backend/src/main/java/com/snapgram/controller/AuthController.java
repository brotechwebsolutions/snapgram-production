package com.snapgram.controller;

import com.snapgram.dto.request.*;
import com.snapgram.dto.response.ApiResponse;
import com.snapgram.dto.response.AuthResponse;
import com.snapgram.security.service.UserDetailsImpl;
import com.snapgram.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Validated
public class AuthController {

    private final AuthService authService;

    // ── SIGNUP STEP 1: Send OTP ───────────────────────────────────────────
    @PostMapping("/send-otp")
    public ResponseEntity<ApiResponse<Void>> sendOtp(@Valid @RequestBody SendOtpRequest request) {
        authService.sendOtp(request);
        return ResponseEntity.ok(ApiResponse.success(
            "Verification code sent to your email. It expires in 5 minutes.", null));
    }

    // ── SIGNUP STEP 2: Verify OTP → create stub user ──────────────────────
    @PostMapping("/verify-otp")
    public ResponseEntity<ApiResponse<String>> verifyOtp(@Valid @RequestBody VerifySignupOtpRequest request) {
        String userId = authService.verifySignupOtp(request);
        return ResponseEntity.ok(ApiResponse.success(
            "Email verified! Please choose a username and set your password.", userId));
    }

    // ── SIGNUP STEP 3: Set username + fullName + password → auto-login ────
    /**
     * Returns AuthResponse (JWT tokens + user) on success so the frontend
     * can auto-login the user immediately after signup — no second login call.
     */
    @PostMapping("/set-password")
    public ResponseEntity<ApiResponse<AuthResponse>> setPassword(
            @Valid @RequestBody SetPasswordRequest request) {
        AuthResponse authResponse = authService.setPassword(request);
        return ResponseEntity.ok(ApiResponse.success(
            "Account created successfully! Welcome to SnapGram.", authResponse));
    }

    // ── LOGIN ──────────────────────────────────────────────────────────────
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest) {
        return ResponseEntity.ok(ApiResponse.success("Login successful",
                authService.login(request, httpRequest)));
    }

    // ── LOGOUT ─────────────────────────────────────────────────────────────
    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            HttpServletRequest request) {
        authService.logout(userDetails.getId(), extractToken(request));
        return ResponseEntity.ok(ApiResponse.success("Logged out successfully", null));
    }

    // ── LEGACY VERIFICATION ────────────────────────────────────────────────
    @GetMapping("/verify-email")
    public ResponseEntity<ApiResponse<Void>> verifyEmail(
            @RequestParam @NotBlank(message = "Token is required") String token) {
        authService.verifyEmail(token);
        return ResponseEntity.ok(ApiResponse.success("Email verified! You can now log in.", null));
    }

    @PostMapping("/resend-verification")
    public ResponseEntity<ApiResponse<Void>> resendVerification(@RequestBody @Valid ResendOtpRequest request) {
        authService.resendVerificationEmail(request.getEmail());
        return ResponseEntity.ok(ApiResponse.success("Verification code sent. Please check your inbox.", null));
    }

    // ── PASSWORD RESET — MODE A: Email Link ───────────────────────────────
    @PostMapping("/forgot-password/link")
    public ResponseEntity<ApiResponse<Void>> forgotPasswordLink(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.forgotPasswordLink(request);
        return ResponseEntity.ok(ApiResponse.success(
            "If an account exists with this email, a reset link has been sent.", null));
    }

    @PostMapping("/reset-password/link")
    public ResponseEntity<ApiResponse<Void>> resetPasswordLink(@Valid @RequestBody ResetPasswordLinkRequest request) {
        authService.resetPasswordLink(request);
        return ResponseEntity.ok(ApiResponse.success("Password reset successfully! You can now log in.", null));
    }

    // ── PASSWORD RESET — MODE B: OTP ──────────────────────────────────────
    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse<Void>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.forgotPassword(request);
        return ResponseEntity.ok(ApiResponse.success(
            "If an account exists with this email, a 6-digit reset code has been sent.", null));
    }

    @PostMapping("/forgot-password/resend")
    public ResponseEntity<ApiResponse<Void>> resendPasswordResetOtp(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.resendPasswordResetOtp(request.getEmail());
        return ResponseEntity.ok(ApiResponse.success("A new reset code has been sent to your email.", null));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse<Void>> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
        return ResponseEntity.ok(ApiResponse.success("Password reset successfully! You can now log in.", null));
    }

    // ── CHANGE PASSWORD ────────────────────────────────────────────────────
    @PutMapping("/change-password")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @Valid @RequestBody ChangePasswordRequest request) {
        authService.changePassword(userDetails.getId(), request);
        return ResponseEntity.ok(ApiResponse.success("Password changed successfully", null));
    }

    private String extractToken(HttpServletRequest request) {
        String h = request.getHeader("Authorization");
        return (h != null && h.startsWith("Bearer ")) ? h.substring(7) : null;
    }
}
