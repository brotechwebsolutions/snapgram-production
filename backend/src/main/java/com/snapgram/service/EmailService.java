package com.snapgram.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/**
 * Email service.
 * ADDED: sendPasswordResetOtpEmail() — sends a 6-digit OTP for password reset,
 *        replacing the old UUID-link-based sendPasswordResetEmail().
 *        Old sendPasswordResetEmail() is kept for any in-flight links already sent.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    // ── PUBLIC API ────────────────────────────────────────────────────────────

    /** Registration OTP — 6-digit code, 5-minute expiry */
    @Async
    public void sendOtpEmail(String to, String username, String otp) {
        sendWithRetry(to, "Your SnapGram verification code: " + otp, otpHtml(username, otp,
            "verify your email address", "5 minutes"));
    }

    /**
     * NEW: Password reset OTP — same 6-digit format, clearly labelled as
     * a password-reset code so users don't confuse it with the signup OTP.
     */
    @Async
    public void sendPasswordResetOtpEmail(String to, String username, String otp) {
        sendWithRetry(to, "Reset your SnapGram password — code: " + otp,
            passwordResetOtpHtml(username, otp));
    }

    /** Legacy: UUID link-based reset (kept for backward compat) */
    @Async
    public void sendPasswordResetEmail(String to, String username, String token) {
        String resetUrl = frontendUrl + "/reset-password?token=" + token;
        sendWithRetry(to, "Reset your SnapGram password", resetHtml(username, resetUrl));
    }

    /** Legacy: UUID link-based email verification */
    @Async
    public void sendVerificationEmail(String to, String username, String token) {
        String url = frontendUrl + "/verify-email?token=" + token;
        sendWithRetry(to, "Verify your SnapGram account", verificationHtml(username, url));
    }

    /** Welcome email after successful verification */
    @Async
    public void sendWelcomeEmail(String to, String username) {
        sendWithRetry(to, "Welcome to SnapGram \uD83C\uDF89", welcomeHtml(username));
    }

    // ── RETRY ────────────────────────────────────────────────────────────────

    private void sendWithRetry(String to, String subject, String html) {
        int  maxAttempts = 3;
        long delayMs     = 1000;
        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                doSend(to, subject, html);
                return;
            } catch (Exception e) {
                log.warn("Email attempt {}/{} failed for {}: {}", attempt, maxAttempts, to, e.getMessage());
                if (attempt < maxAttempts) {
                    try { Thread.sleep(delayMs); } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt(); return;
                    }
                    delayMs *= 2;
                } else {
                    log.error("All {} email attempts failed for {}", maxAttempts, to);
                }
            }
        }
    }

    private void doSend(String to, String subject, String html)
            throws MessagingException, java.io.UnsupportedEncodingException {
        MimeMessage msg     = mailSender.createMimeMessage();
        MimeMessageHelper h = new MimeMessageHelper(msg, true, "UTF-8");
        h.setFrom(fromEmail, "SnapGram");
        h.setTo(to);
        h.setSubject(subject);
        h.setText(html, true);
        mailSender.send(msg);
        log.info("\u2709\uFE0F  Email sent → {}: {}", to, subject);
    }

    // ── HTML TEMPLATES ────────────────────────────────────────────────────────

    /**
     * Generic OTP template — used for both signup and (with different params) other flows.
     */
    private String otpHtml(String username, String otp, String purpose, String expiry) {
        return wrap(
            "<h2 style='color:#262626;margin-bottom:8px'>Hello, " + esc(username) + "! \uD83D\uDC4B</h2>" +
            "<p style='color:#737373;font-size:16px;margin-bottom:24px'>Use the code below to " +
            purpose + ". It expires in <strong>" + expiry + "</strong>.</p>" +
            bigOtp(otp) +
            "<p style='color:#737373;font-size:14px;text-align:center'>\u26A0\uFE0F Never share this code. SnapGram will never ask for it.</p>" +
            "<p style='color:#c7c7c7;font-size:12px;text-align:center;margin-top:16px'>Didn't request this? You can safely ignore this email.</p>"
        );
    }

    /**
     * Password reset OTP — visually distinct from signup OTP (red accent, clear labelling).
     */
    private String passwordResetOtpHtml(String username, String otp) {
        return wrap(
            "<h2 style='color:#262626;margin-bottom:8px'>Password reset code \uD83D\uDD10</h2>" +
            "<p style='color:#737373;font-size:16px;margin-bottom:8px'>Hi <strong>" + esc(username) +
            "</strong>, we received a request to reset your SnapGram password.</p>" +
            "<p style='color:#737373;font-size:16px;margin-bottom:24px'>Enter this code on the password reset page. " +
            "It expires in <strong>10 minutes</strong>.</p>" +
            "<div style='text-align:center;margin:32px 0'>" +
              "<div style='display:inline-block;background:#fff5f5;border-radius:16px;padding:20px 48px;" +
                   "border:2px dashed #E1306C'>" +
                "<span style='font-size:44px;font-weight:900;letter-spacing:12px;color:#262626;" +
                      "font-family:monospace'>" + esc(otp) + "</span>" +
              "</div>" +
            "</div>" +
            "<p style='color:#737373;font-size:14px;text-align:center'>\u26A0\uFE0F Never share this code. " +
            "SnapGram will never ask for it.</p>" +
            "<p style='color:#c7c7c7;font-size:12px;text-align:center;margin-top:16px'>" +
            "If you didn't request a password reset, your account is safe — just ignore this email.</p>"
        );
    }

    private String verificationHtml(String username, String url) {
        return wrap(
            "<h2 style='color:#262626'>Hello, " + esc(username) + "! \uD83D\uDC4B</h2>" +
            "<p style='color:#737373;font-size:16px;margin-bottom:24px'>Click the button below to verify your email and activate your account.</p>" +
            "<div style='text-align:center;margin:32px 0'>" +
              "<a href='" + url + "' style='background:linear-gradient(135deg,#405DE6,#C13584);color:#fff;" +
              "text-decoration:none;padding:16px 40px;border-radius:50px;font-size:16px;font-weight:600;display:inline-block'>Verify Email</a>" +
            "</div>" +
            "<p style='color:#737373;font-size:14px'>\u26A0\uFE0F This link expires in <strong>24 hours</strong>.</p>"
        );
    }

    private String resetHtml(String username, String url) {
        return wrap(
            "<h2 style='color:#262626'>Reset your password \uD83D\uDD10</h2>" +
            "<p style='color:#737373;font-size:16px'>Hi <strong>" + esc(username) + "</strong>, click below to reset your password.</p>" +
            "<div style='text-align:center;margin:32px 0'>" +
              "<a href='" + url + "' style='background:linear-gradient(135deg,#405DE6,#C13584);color:#fff;" +
              "text-decoration:none;padding:16px 40px;border-radius:50px;font-size:16px;font-weight:600;display:inline-block'>Reset Password</a>" +
            "</div>" +
            "<p style='color:#737373;font-size:14px'>\u26A0\uFE0F Expires in <strong>30 minutes</strong>.</p>"
        );
    }

    private String welcomeHtml(String username) {
        return wrap(
            "<h2 style='color:#262626'>Welcome to SnapGram, " + esc(username) + "! \uD83C\uDF89</h2>" +
            "<p style='color:#737373;font-size:16px'>Your account is verified and ready to go!</p>" +
            "<ul style='color:#737373;font-size:15px;line-height:2.2;padding-left:20px'>" +
              "<li>\uD83D\uDCF8 Share photos and stories</li>" +
              "<li>\uD83D\uDCAC Chat with friends in real-time</li>" +
              "<li>\u2764\uFE0F Like, comment and react</li>" +
              "<li>\uD83D\uDD0D Discover trending content</li>" +
            "</ul>"
        );
    }

    private String bigOtp(String otp) {
        return "<div style='text-align:center;margin:32px 0'>" +
               "<div style='display:inline-block;background:#f4f4f4;border-radius:16px;padding:20px 48px;border:2px dashed #C13584'>" +
               "<span style='font-size:44px;font-weight:900;letter-spacing:12px;color:#262626;font-family:monospace'>" +
               esc(otp) + "</span></div></div>";
    }

    private String wrap(String body) {
        return "<!DOCTYPE html><html lang='en'><head><meta charset='UTF-8'>" +
               "<meta name='viewport' content='width=device-width,initial-scale=1'></head>" +
               "<body style='margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif;background:#f4f4f4'>" +
               "<table width='100%' cellpadding='0' cellspacing='0' style='background:#f4f4f4;padding:40px 0'><tr><td align='center'>" +
               "<table width='600' cellpadding='0' cellspacing='0' style='background:#fff;border-radius:16px;overflow:hidden;" +
               "box-shadow:0 4px 20px rgba(0,0,0,0.08);max-width:600px;width:100%'>" +
               "<tr><td style='background:linear-gradient(135deg,#405DE6,#5851DB,#833AB4,#C13584,#E1306C,#FD1D1D);padding:36px;text-align:center'>" +
               "<h1 style='color:#fff;margin:0;font-size:28px;font-weight:800;letter-spacing:-0.5px'>SnapGram</h1>" +
               "<p style='color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:14px'>Share your moments</p>" +
               "</td></tr><tr><td style='padding:40px'>" + body + "</td></tr>" +
               "<tr><td style='background:#fafafa;padding:20px;text-align:center;border-top:1px solid #efefef'>" +
               "<p style='color:#c7c7c7;font-size:12px;margin:0'>&copy; 2024 SnapGram &middot; All rights reserved</p>" +
               "</td></tr></table></td></tr></table></body></html>";
    }

    private String esc(String s) {
        if (s == null) return "";
        return s.replace("&","&amp;").replace("<","&lt;").replace(">","&gt;").replace("\"","&quot;");
    }
}
