package com.curex.user.service;

import com.curex.user.exception.InvalidOtpException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory OTP (One-Time Password) service for phone and email verification.
 *
 * <p>OTPs are stored in {@link ConcurrentHashMap}s with a configurable TTL. Once a code is
 * verified, a short-lived verification token is issued and stored in a second map. The token
 * must be presented during user registration to prove that the contact has been verified.
 *
 * <p>OTP delivery is delegated to the notification-service via RabbitMQ. The user-service
 * publishes an event to {@code user.exchange} with routing key {@code user.otp.send},
 * and the notification-service consumes it to send the actual SMS or email.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class OtpService {

    private static final int OTP_TTL_MINUTES           = 5;
    private static final int VERIFICATION_TOKEN_TTL_MINUTES = 30;

    private final SecureRandom random = new SecureRandom();
    private final RabbitTemplate rabbitTemplate;

    // ── Phone OTP storage ─────────────────────────────────────────────────────
    /** phone → pending OTP entry */
    private final ConcurrentHashMap<String, OtpEntry> pendingPhoneOtps = new ConcurrentHashMap<>();
    /** verificationToken → verified phone entry */
    private final ConcurrentHashMap<String, VerificationEntry> verifiedPhones = new ConcurrentHashMap<>();

    // ── Email OTP storage ─────────────────────────────────────────────────────
    /** email → pending OTP entry */
    private final ConcurrentHashMap<String, OtpEntry> pendingEmailOtps = new ConcurrentHashMap<>();
    /** verificationToken → verified email entry */
    private final ConcurrentHashMap<String, VerificationEntry> verifiedEmails = new ConcurrentHashMap<>();

    // ── Phone OTP API ─────────────────────────────────────────────────────────

    /**
     * Generates a 6-digit OTP for the given phone number and publishes a delivery
     * event to the notification-service via RabbitMQ.
     *
     * @param phoneNumber normalised phone string
     */
    public void sendPhoneOtp(String phoneNumber) {
        String otp = generateOtp();
        pendingPhoneOtps.put(phoneNumber, new OtpEntry(otp, LocalDateTime.now().plusMinutes(OTP_TTL_MINUTES)));

        publishOtpEvent(phoneNumber, otp, "SMS");
        log.info("Phone OTP generated for {} and published to notification-service", phoneNumber);
    }

    /**
     * Verifies the supplied OTP code for the given phone number.
     * On success a verification token is returned.
     */
    public String verifyPhoneOtp(String phoneNumber, String otpCode) {
        OtpEntry entry = pendingPhoneOtps.get(phoneNumber);

        if (entry == null || entry.isExpired()) {
            pendingPhoneOtps.remove(phoneNumber);
            throw new InvalidOtpException("Phone OTP has expired or was not sent. Please request a new code.");
        }
        if (!entry.otp().equals(otpCode)) {
            throw new InvalidOtpException("Invalid phone OTP code. Please check and try again.");
        }

        pendingPhoneOtps.remove(phoneNumber);

        String token = UUID.randomUUID().toString();
        verifiedPhones.put(token, new VerificationEntry(
                phoneNumber,
                LocalDateTime.now().plusMinutes(VERIFICATION_TOKEN_TTL_MINUTES)));

        log.info("Phone {} verified; issued token {}", phoneNumber, token);
        return token;
    }

    /**
     * Checks whether the given token is valid and was issued for the given phone number.
     */
    public boolean isPhoneVerified(String phoneNumber, String token) {
        if (token == null || token.isBlank()) return false;
        VerificationEntry entry = verifiedPhones.get(token);
        if (entry == null || entry.isExpired()) {
            verifiedPhones.remove(token);
            return false;
        }
        return entry.identifier().equals(phoneNumber);
    }

    /**
     * Removes the phone verification token after it has been used during registration.
     */
    public void consumePhoneVerificationToken(String token) {
        verifiedPhones.remove(token);
    }

    // ── Email OTP API ─────────────────────────────────────────────────────────

    /**
     * Generates a 6-digit OTP for the given email address and publishes a delivery
     * event to the notification-service via RabbitMQ.
     *
     * @param email the recipient email address
     */
    public void sendEmailOtp(String email) {
        String otp = generateOtp();
        pendingEmailOtps.put(email, new OtpEntry(otp, LocalDateTime.now().plusMinutes(OTP_TTL_MINUTES)));

        publishOtpEvent(email, otp, "EMAIL");
        log.info("Email OTP generated for {} and published to notification-service", email);
    }

    /**
     * Verifies the supplied OTP code for the given email address.
     * On success a verification token is returned.
     */
    public String verifyEmailOtp(String email, String otpCode) {
        OtpEntry entry = pendingEmailOtps.get(email);

        if (entry == null || entry.isExpired()) {
            pendingEmailOtps.remove(email);
            throw new InvalidOtpException("Email OTP has expired or was not sent. Please request a new code.");
        }
        if (!entry.otp().equals(otpCode)) {
            throw new InvalidOtpException("Invalid email OTP code. Please check and try again.");
        }

        pendingEmailOtps.remove(email);

        String token = UUID.randomUUID().toString();
        verifiedEmails.put(token, new VerificationEntry(
                email,
                LocalDateTime.now().plusMinutes(VERIFICATION_TOKEN_TTL_MINUTES)));

        log.info("Email {} verified; issued token {}", email, token);
        return token;
    }

    /**
     * Checks whether the given token is valid and was issued for the given email.
     */
    public boolean isEmailVerified(String email, String token) {
        if (token == null || token.isBlank()) return false;
        VerificationEntry entry = verifiedEmails.get(token);
        if (entry == null || entry.isExpired()) {
            verifiedEmails.remove(token);
            return false;
        }
        return entry.identifier().equals(email);
    }

    /**
     * Removes the email verification token after it has been used during registration.
     */
    public void consumeEmailVerificationToken(String token) {
        verifiedEmails.remove(token);
    }

    // ── RabbitMQ event publishing ─────────────────────────────────────────────

    /**
     * Publishes an OTP delivery event to the notification-service via RabbitMQ.
     *
     * @param recipient phone number or email address
     * @param otp       the generated OTP code
     * @param channel   "SMS" or "EMAIL"
     */
    private void publishOtpEvent(String recipient, String otp, String channel) {
        try {
            Map<String, Object> event = new HashMap<>();
            event.put("recipient", recipient);
            event.put("otp", otp);
            event.put("channel", channel);

            rabbitTemplate.convertAndSend("user.exchange", "user.otp.send", event);
            log.debug("Published OTP event: channel={}, recipient={}", channel, recipient);
        } catch (Exception e) {
            // Log but don't fail — the OTP is still stored in-memory for verification.
            // Delivery failure doesn't block the flow; the user can resend.
            log.error("Failed to publish OTP event for {}: {}", recipient, e.getMessage());
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private String generateOtp() {
        return String.format("%06d", random.nextInt(1_000_000));
    }

    // ── Internal record types ─────────────────────────────────────────────────

    private record OtpEntry(String otp, LocalDateTime expiry) {
        boolean isExpired() {
            return LocalDateTime.now().isAfter(expiry);
        }
    }

    private record VerificationEntry(String identifier, LocalDateTime expiry) {
        boolean isExpired() {
            return LocalDateTime.now().isAfter(expiry);
        }
    }
}
