package com.snapgram.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${BREVO_API_KEY}")
    private String brevoApiKey;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    private final String fromEmail = "brotechinformation@gmail.com";

    // ── PUBLIC API ─────────────────────────────────────────

    @Async
    public void sendOtpEmail(String to, String username, String otp) {
        sendWithRetry(to, "Your SnapGram verification code: " + otp,
                otpHtml(username, otp, "verify your email address", "5 minutes"));
    }

    @Async
    public void sendPasswordResetOtpEmail(String to, String username, String otp) {
        sendWithRetry(to, "Reset your SnapGram password — code: " + otp,
                passwordResetOtpHtml(username, otp));
    }

    @Async
    public void sendPasswordResetEmail(String to, String username, String token) {
        String resetUrl = frontendUrl + "/reset-password?token=" + token;
        sendWithRetry(to, "Reset your SnapGram password", resetHtml(username, resetUrl));
    }

    @Async
    public void sendVerificationEmail(String to, String username, String token) {
        String url = frontendUrl + "/verify-email?token=" + token;
        sendWithRetry(to, "Verify your SnapGram account", verificationHtml(username, url));
    }

    @Async
    public void sendWelcomeEmail(String to, String username) {
        sendWithRetry(to, "Welcome to SnapGram 🎉", welcomeHtml(username));
    }

    // ── RETRY LOGIC ────────────────────────────────────────

    private void sendWithRetry(String to, String subject, String html) {
        int maxAttempts = 3;
        long delayMs = 1000;

        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                doSend(to, subject, html);
                return;
            } catch (Exception e) {
                log.warn("Email attempt {}/{} failed for {}: {}", attempt, maxAttempts, to, e.getMessage());

                if (attempt < maxAttempts) {
                    try { Thread.sleep(delayMs); } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        return;
                    }
                    delayMs *= 2;
                } else {
                    log.error("All {} email attempts failed for {}", maxAttempts, to);
                }
            }
        }
    }

    // ── BREVO API SEND (MAIN CHANGE) ───────────────────────

    private void doSend(String to, String subject, String html) {

        String url = "https://api.brevo.com/v3/smtp/email";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("api-key", brevoApiKey);

        String body = "{\n" +
                "\"sender\":{\"email\":\"" + fromEmail + "\",\"name\":\"SnapGram\"},\n" +
                "\"to\":[{\"email\":\"" + to + "\"}],\n" +
                "\"subject\":\"" + subject + "\",\n" +
                "\"htmlContent\":\"" + html.replace("\"", "\\\"").replace("\n", "") + "\"\n" +
                "}";

        HttpEntity<String> request = new HttpEntity<>(body, headers);

        restTemplate.postForEntity(url, request, String.class);

        log.info("📧 Email sent via Brevo → {}: {}", to, subject);
    }

    // ── HTML TEMPLATES (UNCHANGED) ─────────────────────────

    private String otpHtml(String username, String otp, String purpose, String expiry) {
        return wrap(
                "<h2>Hello, " + esc(username) + " 👋</h2>" +
                "<p>Use this code to " + purpose + " (expires in " + expiry + ")</p>" +
                "<h1>" + esc(otp) + "</h1>"
        );
    }

    private String passwordResetOtpHtml(String username, String otp) {
        return wrap(
                "<h2>Password Reset 🔐</h2>" +
                "<p>Hello " + esc(username) + "</p>" +
                "<h1>" + esc(otp) + "</h1>"
        );
    }

    private String verificationHtml(String username, String url) {
        return wrap("<h2>Hello " + esc(username) + "</h2><a href='" + url + "'>Verify Email</a>");
    }

    private String resetHtml(String username, String url) {
        return wrap("<h2>Reset Password</h2><a href='" + url + "'>Reset</a>");
    }

    private String welcomeHtml(String username) {
        return wrap("<h2>Welcome " + esc(username) + " 🎉</h2>");
    }

    private String wrap(String body) {
        return "<html><body>" + body + "</body></html>";
    }

    private String esc(String s) {
        if (s == null) return "";
        return s.replace("&","&amp;")
                .replace("<","&lt;")
                .replace(">","&gt;")
                .replace("\"","&quot;");
    }
}