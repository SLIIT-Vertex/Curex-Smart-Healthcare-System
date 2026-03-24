package com.curex.notification.service;

import com.curex.notification.config.TextLkProperties;
import com.curex.notification.entity.Notification;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * High-level SMS service.
 *
 * Responsibilities:
 *  - Format message content per notification type (business logic)
 *  - Normalise phone numbers to Sri Lanka international format
 *  - Delegate to TextLkSmsService for actual delivery
 *
 * NotificationService calls this class; it knows nothing about Text.lk internals.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SmsService {

    private final TextLkSmsService textLkSmsService;
    private final TextLkProperties textLkProperties;

    /**
     * Send an SMS for a persisted Notification entity.
     * Called by NotificationService after the entity is saved.
     *
     * @return true if sent successfully, false on any failure
     */
    public boolean sendSms(Notification notification) {
        try {
            String phone = normalisePhoneNumber(notification.getRecipientPhone());
            String body  = buildSmsContent(notification);

            var response = textLkSmsService.sendSms(phone, body);

            // Store the Text.lk message UID for delivery tracking
            if (response != null && response.getData() != null) {
                notification.setExternalId(response.getData().toString());
            }

            return true;

        } catch (TextLkSmsService.TextLkException ex) {
            log.error("SMS delivery failed for notification {}: {}", notification.getId(), ex.getMessage());
            notification.setErrorMessage(ex.getMessage());
            return false;
        } catch (Exception ex) {
            log.error("Unexpected error sending SMS for notification {}: {}", notification.getId(), ex.getMessage());
            notification.setErrorMessage("Unexpected error: " + ex.getMessage());
            return false;
        }
    }

    /**
     * Send a one-time password (OTP) SMS directly.
     * Bypasses the Notification entity — use for login / verification flows.
     *
     * @param recipient  Phone number (e.g. 94710000000 or 0710000000)
     * @param otp        The OTP code to deliver
     */
    public void sendOtp(String recipient, String otp) {
        String phone = normalisePhoneNumber(recipient);
        textLkSmsService.sendOtp(phone, otp, null);
        log.info("OTP sent to: {}", phone);
    }

    /**
     * Send a plain notification SMS directly (no Notification entity).
     *
     * @param recipient Phone number
     * @param message   Message body
     */
    public void sendDirectNotification(String recipient, String message) {
        String phone = normalisePhoneNumber(recipient);
        textLkSmsService.sendNotification(phone, message);
        log.info("Notification SMS sent to: {}", phone);
    }

    public boolean isAvailable() {
        return textLkProperties.isConfigured();
    }

    //  Content builders 

    public String getWelcomeSmsContent(String firstName) {
        return "Hi " + firstName + "! Welcome to Curex Healthcare. Your account is ready.";
    }

    public String getAppointmentReminderContent(String patientName, String doctorName, String appointmentTime) {
        return "Hi " + patientName + ", reminder: Appointment with Dr. " + doctorName
                + " at " + appointmentTime + " today. - Curex";
    }

    public String getOtpSmsContent(String otp) {
        return "Your Curex verification code is: " + otp + ". Do not share this code with anyone.";
    }

    //  Private helpers 

    /**
     * Normalise phone numbers to international format without '+'.
     * Text.lk expects bare digits: 94710000000 (not +94710000000).
     *
     * Rules (Sri Lanka-centric, same as original JS service):
     *  - Already starts with "94"         → keep as-is
     *  - Starts with "0"                  → strip 0, prepend 94
     *  - Anything else (bare 7-digit etc) → prepend 94
     */
    private String normalisePhoneNumber(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new IllegalArgumentException("Phone number cannot be blank");
        }

        String digits = raw.replaceAll("[^\\d]", "");

        if (digits.startsWith("94")) {
            return digits;
        }
        if (digits.startsWith("0")) {
            return "94" + digits.substring(1);
        }
        return "94" + digits;
    }

    /**
     * Build a concise (≤160 char) SMS body per notification type.
     */
    private String buildSmsContent(Notification notification) {
        String base = truncate(notification.getContent(), 120);

        return switch (notification.getType()) {
            case APPOINTMENT_CONFIRMATION ->
                    "Curex: Your appointment is confirmed. " + base;
            case APPOINTMENT_REMINDER ->
                    "Curex Reminder: " + base;
            case WELCOME ->
                    "Welcome to Curex Healthcare! " + base;
            case EMAIL_VERIFICATION ->
                    "Curex: Verify your email. " + base;
            case PASSWORD_RESET ->
                    "Curex: Password reset request. " + base;
            case DOCTOR_APPROVAL ->
                    "Curex: Your doctor account has been approved! " + base;
            case DOCTOR_REJECTION ->
                    "Curex: Doctor application update. " + base;
            case PAYMENT_CONFIRMATION ->
                    "Curex: Payment confirmed. " + base;
            case PRESCRIPTION_READY ->
                    "Curex: Your prescription is ready. " + base;
            case CONSULTATION_REMINDER ->
                    "Curex: Consultation reminder. " + base;
            default ->
                    "Curex: " + base;
        };
    }

    private String truncate(String text, int max) {
        if (text == null) return "";
        return text.length() <= max ? text : text.substring(0, max - 3) + "...";
    }
}
