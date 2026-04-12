package com.snapgram.scheduler;

import com.snapgram.model.Note;
import com.snapgram.model.OtpPending;
import com.snapgram.model.Story;
import com.snapgram.repository.NoteRepository;
import com.snapgram.repository.OtpPendingRepository;
import com.snapgram.repository.StoryRepository;
import com.snapgram.repository.UserRepository;
import com.snapgram.service.CloudinaryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Background cleanup scheduler:
 *
 *   - Expired stories (+ Cloudinary media)
 *   - Expired notes
 *   - Expired otp_pending records (FIX BUG-7: was missing)
 *   - Expired password-reset OTPs
 *   - Expired legacy UUID tokens
 *   - Auto-unlock accounts
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class CleanupScheduler {

    private final StoryRepository      storyRepository;
    private final NoteRepository       noteRepository;
    private final UserRepository       userRepository;
    private final OtpPendingRepository otpPendingRepository;  // FIX BUG-7: was declared but unused
    private final CloudinaryService    cloudinaryService;

    /** Remove expired stories + their Cloudinary files. Runs every hour. */
    @Scheduled(fixedRate = 3_600_000)
    public void cleanupExpiredStories() {
        List<Story> expired = storyRepository.findExpiredStories(LocalDateTime.now());
        if (expired.isEmpty()) return;
        expired.forEach(s -> {
            try {
                cloudinaryService.deleteResource(s.getMediaPublicId());
                storyRepository.delete(s);
            } catch (Exception e) {
                log.error("Story cleanup failed for {}: {}", s.getId(), e.getMessage());
            }
        });
        log.info("Cleaned {} expired stories", expired.size());
    }

    /** Remove expired notes. Runs every hour. */
    @Scheduled(fixedRate = 3_600_000)
    public void cleanupExpiredNotes() {
        List<Note> expired = noteRepository.findExpiredNotes(LocalDateTime.now());
        if (expired.isEmpty()) return;
        noteRepository.deleteAll(expired);
        log.info("Cleaned {} expired notes", expired.size());
    }

    /**
     * FIX BUG-7: Clean expired otp_pending records.
     * Without this, OtpPending records accumulate in MongoDB indefinitely.
     * Runs every 15 minutes (much more frequent than 3 AM daily because
     * OTPs have a 5-minute TTL and should be purged quickly).
     */
    @Scheduled(fixedRate = 900_000) // every 15 minutes
    public void cleanupExpiredOtpPending() {
        List<OtpPending> expired = otpPendingRepository.findByExpiresAtBefore(LocalDateTime.now());
        if (expired.isEmpty()) return;
        otpPendingRepository.deleteAll(expired);
        log.info("Cleaned {} expired OtpPending records", expired.size());
    }

    /**
     * Clean expired OTPs and tokens stored on User documents.
     * Runs at 3 AM daily.
     */
    @Scheduled(cron = "0 0 3 * * ?")
    public void cleanupExpiredTokensAndOtps() {
        LocalDateTime now = LocalDateTime.now();
        int[] counts = {0};

        userRepository.findAll().forEach(user -> {
            boolean changed = false;

            // Clear expired password-reset OTP
            if (user.getPasswordResetOtpExpiry() != null
                    && user.getPasswordResetOtpExpiry().isBefore(now)
                    && user.getPasswordResetOtp() != null) {
                user.setPasswordResetOtp(null);
                user.setPasswordResetOtpExpiry(null);
                user.setPasswordResetOtpAttempts(0);
                changed = true;
            }

            // Clear expired legacy UUID password-reset token
            if (user.getPasswordResetTokenExpiry() != null
                    && user.getPasswordResetTokenExpiry().isBefore(now)
                    && user.getPasswordResetToken() != null) {
                user.setPasswordResetToken(null);
                user.setPasswordResetTokenExpiry(null);
                changed = true;
            }

            // Clear expired legacy email-verification token
            if (user.getEmailVerificationToken() != null
                    && user.getEmailVerificationTokenExpiry() != null
                    && user.getEmailVerificationTokenExpiry().isBefore(now)
                    && !user.isEmailVerified()) {
                user.setEmailVerificationToken(null);
                user.setEmailVerificationTokenExpiry(null);
                changed = true;
            }

            if (changed) {
                userRepository.save(user);
                counts[0]++;
            }
        });

        if (counts[0] > 0) log.info("Cleaned expired tokens/OTPs for {} users", counts[0]);
    }

    /** Auto-unlock accounts whose lock period has expired. Runs every 5 minutes. */
    @Scheduled(fixedRate = 300_000)
    public void unlockExpiredAccounts() {
        LocalDateTime now = LocalDateTime.now();
        userRepository.findAll().stream()
                .filter(u -> u.isAccountLocked()
                        && u.getLockedUntil() != null
                        && u.getLockedUntil().isBefore(now))
                .forEach(u -> {
                    u.setAccountLocked(false);
                    u.setFailedLoginAttempts(0);
                    u.setLockedUntil(null);
                    userRepository.save(u);
                    log.info("Auto-unlocked: {}", u.getEmail());
                });
    }
}
