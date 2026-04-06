package com.curex.notification.consumer;

import com.curex.notification.client.UserPreferenceClient;
import com.curex.notification.dto.NotificationRequest;
import com.curex.notification.entity.Notification;
import com.curex.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import org.springframework.web.util.HtmlUtils;

import java.util.Map;

/**
 * Consumes domain events from RabbitMQ and dispatches notifications.
 *
 * The listener container factory is configured with Jackson2JsonMessageConverter,
 * which deserialises the JSON payload directly into the declared method-parameter
 * type. Declaring the parameter as Map<String, Object> lets Jackson convert the
 * JSON object correctly. Using String + manual ObjectMapper.readValue() causes a
 * MismatchedInputException because the converter sees a JSON object (START_OBJECT)
 * where a scalar string is expected.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationEventConsumer {

    private final NotificationService notificationService;
    private final UserPreferenceClient userPreferenceClient;

    // ── User registration ─────────────────────────────────────────────────────

    @RabbitListener(queues = "user.registration.queue")
    public void handleUserRegistration(Map<String, Object> event) {
        try {
            log.info("Received user.registration event for email={}", event.get("email"));

            String userId      = (String) event.get("userId");
            String email       = (String) event.get("email");
            String firstName   = (String) event.get("firstName");
            String userRole    = (String) event.get("role");
            String phoneNumber = (String) event.get("phoneNumber");

            notificationService.sendNotificationAsync(NotificationRequest.builder()
                    .userId(userId)
                    .recipientEmail(email)
                    .type(Notification.NotificationType.WELCOME)
                    .channel(Notification.NotificationChannel.EMAIL)
                    .subject("Welcome to Curex Healthcare Platform!")
                    .content(buildWelcomeEmailContent(firstName, userRole))
                    .build());

            if (phoneNumber != null && !phoneNumber.isBlank()) {
                notificationService.sendNotificationAsync(NotificationRequest.builder()
                        .userId(userId)
                        .recipientPhone(phoneNumber)
                        .type(Notification.NotificationType.WELCOME)
                        .channel(Notification.NotificationChannel.SMS)
                        .subject("Welcome to Curex!")
                        .content(String.format("Hi %s! Welcome to Curex Healthcare. Your account is ready.",
                                HtmlUtils.htmlEscape(firstName)))
                        .build());
            }
        } catch (Exception e) {
            log.error("Failed to process user.registration event: {}", e.getMessage(), e);
        }
    }

    // ── Admin user status changes ────────────────────────────────────────────

    @RabbitListener(queues = "user.status.queue")
    public void handleUserStatusChanged(Map<String, Object> event) {
        try {
            String userId = (String) event.get("userId");
            String email = (String) event.get("email");
            String firstName = (String) event.get("firstName");
            String role = (String) event.get("role");
            String status = (String) event.get("status");
            String action = (String) event.get("action");
            String notes = (String) event.get("notes");

            String subject = "Account Status Updated - Curex Healthcare";
            String inAppMessage = String.format(
                    "Your %s account status has been updated to %s.",
                    HtmlUtils.htmlEscape(role == null ? "user" : role.toLowerCase()),
                    HtmlUtils.htmlEscape(status == null ? "UPDATED" : status)
            );

            if (email != null && !email.isBlank()) {
                notificationService.sendNotificationAsync(NotificationRequest.builder()
                        .userId(userId)
                        .recipientEmail(email)
                        .type(Notification.NotificationType.SYSTEM_ALERT)
                        .channel(Notification.NotificationChannel.EMAIL)
                        .subject(subject)
                        .content(buildStatusChangedEmailContent(firstName, role, status, action, notes))
                        .build());
            }

            notificationService.sendNotificationAsync(NotificationRequest.builder()
                    .userId(userId)
                    .type(Notification.NotificationType.SYSTEM_ALERT)
                    .channel(Notification.NotificationChannel.IN_APP)
                    .subject("Account Status Updated")
                    .content(inAppMessage)
                    .build());
        } catch (Exception e) {
            log.error("Failed to process user.status.changed event: {}", e.getMessage(), e);
        }
    }

    @RabbitListener(queues = "user.password.queue")
    public void handleUserPasswordChanged(Map<String, Object> event) {
        try {
            String userId = (String) event.get("userId");
            String email = (String) event.get("email");
            String firstName = (String) event.get("firstName");
            String changedAt = (String) event.get("changedAt");

            if (email == null || email.isBlank()) {
                log.warn("Skipping password-changed notification because email is missing for userId={}", userId);
                return;
            }

            notificationService.sendNotificationAsync(NotificationRequest.builder()
                    .userId(userId)
                    .recipientEmail(email)
                    .type(Notification.NotificationType.PASSWORD_RESET)
                    .channel(Notification.NotificationChannel.EMAIL)
                    .subject("Security Alert: Password Changed")
                    .content(buildPasswordChangedEmailContent(firstName, changedAt))
                    .build());
        } catch (Exception e) {
            log.error("Failed to process user.password.changed event: {}", e.getMessage(), e);
        }
    }

    // ── OTP delivery ──────────────────────────────────────────────────────────

    /**
     * Consumes OTP delivery events published by the user-service.
     * Routes the OTP to the correct channel (SMS or EMAIL) via NotificationService.
     *
     * Event payload:
     *   { "recipient": "...", "otp": "...", "channel": "SMS" | "EMAIL" }
     */
    @RabbitListener(queues = "user.otp.queue")
    public void handleOtpSend(Map<String, Object> event) {
        try {
            String recipient = (String) event.get("recipient");
            String otp       = (String) event.get("otp");
            String channel   = (String) event.get("channel");

            log.info("Received user.otp.send event: channel={}, recipient={}", channel, recipient);

            if ("SMS".equalsIgnoreCase(channel)) {
                String content = "Your Curex verification code is: " + otp + ". Do not share this code with anyone.";
                notificationService.sendNotificationAsync(NotificationRequest.builder()
                        .userId("otp-verification")
                        .recipientPhone(recipient)
                        .type(Notification.NotificationType.OTP_VERIFICATION)
                        .channel(Notification.NotificationChannel.SMS)
                        .subject("Curex OTP Verification")
                        .content(content)
                        .build());
            } else if ("EMAIL".equalsIgnoreCase(channel)) {
                String content = buildOtpEmailContent(otp);
                notificationService.sendNotificationAsync(NotificationRequest.builder()
                        .userId("otp-verification")
                        .recipientEmail(recipient)
                        .type(Notification.NotificationType.OTP_VERIFICATION)
                        .channel(Notification.NotificationChannel.EMAIL)
                        .subject("Curex Healthcare — Your Verification Code")
                        .content(content)
                        .build());
            } else {
                log.warn("Unknown OTP channel: {}", channel);
            }
        } catch (Exception e) {
            log.error("Failed to process user.otp.send event: {}", e.getMessage(), e);
        }
    }

    // ── Appointment booking ───────────────────────────────────────────────────

    @RabbitListener(queues = "appointment.booking.queue")
    public void handleAppointmentBooking(Map<String, Object> event) {
        try {
            log.info("Received appointment.booking event");

            String patientId       = (String) event.get("patientId");
            String patientEmail    = (String) event.get("patientEmail");
            String patientName     = (String) event.get("patientName");
            String doctorName      = (String) event.get("doctorName");
            String appointmentDate = (String) event.get("appointmentDate");
            String appointmentTime = (String) event.get("appointmentTime");
            String patientPhone    = (String) event.get("patientPhone");

            UserPreferenceClient.NotificationPreferences preferences =
                    userPreferenceClient.getNotificationPreferences(patientId);
            if (!preferences.isAppointmentRemindersEnabled()) {
                log.info("Skipping appointment notification for user {} due to preference", patientId);
                return;
            }

                if (patientEmail != null && !patientEmail.isBlank()) {
                notificationService.sendNotificationAsync(NotificationRequest.builder()
                    .userId(patientId)
                    .recipientEmail(patientEmail)
                    .type(Notification.NotificationType.APPOINTMENT_CONFIRMATION)
                    .channel(Notification.NotificationChannel.EMAIL)
                    .subject("Appointment Confirmation - Curex Healthcare")
                    .content(buildAppointmentConfirmationContent(patientName, doctorName,
                        appointmentDate, appointmentTime))
                    .build());
                }

                notificationService.sendNotificationAsync(NotificationRequest.builder()
                    .userId(patientId)
                    .type(Notification.NotificationType.APPOINTMENT_CONFIRMATION)
                    .channel(Notification.NotificationChannel.IN_APP)
                    .subject("Appointment Confirmed")
                    .content(String.format("Appointment with Dr. %s confirmed for %s at %s.",
                        HtmlUtils.htmlEscape(doctorName),
                        HtmlUtils.htmlEscape(appointmentDate),
                        HtmlUtils.htmlEscape(appointmentTime)))
                    .build());

            if (patientPhone != null && !patientPhone.isBlank()) {
                notificationService.sendNotificationAsync(NotificationRequest.builder()
                        .userId(patientId)
                        .recipientPhone(patientPhone)
                        .type(Notification.NotificationType.APPOINTMENT_CONFIRMATION)
                        .channel(Notification.NotificationChannel.SMS)
                        .subject("Appointment Confirmed")
                        .content(String.format("Appointment with Dr. %s confirmed for %s at %s.",
                                HtmlUtils.htmlEscape(doctorName),
                                HtmlUtils.htmlEscape(appointmentDate),
                                HtmlUtils.htmlEscape(appointmentTime)))
                        .build());
            }
        } catch (Exception e) {
            log.error("Failed to process appointment.booking event: {}", e.getMessage(), e);
        }
    }

    // ── Payment confirmation ──────────────────────────────────────────────────

    @RabbitListener(queues = "payment.confirmation.queue")
    public void handlePaymentConfirmation(Map<String, Object> event) {
        try {
            log.info("Received payment.confirmation event");

            String patientId     = (String) event.get("patientId");
            String patientEmail  = (String) event.get("patientEmail");
            String patientName   = (String) event.get("patientName");
            String amount        = (String) event.get("amount");
            String appointmentId = (String) event.get("appointmentId");

            if (patientId != null && !patientId.isBlank()
                && (patientEmail == null || patientEmail.isBlank())) {
            String resolved = userPreferenceClient.resolveUserEmail(patientId);
            if (resolved != null) {
                patientEmail = resolved;
            }
            }

            String safePatientName = (patientName == null || patientName.isBlank())
                ? "Patient"
                : patientName;
            String safeAmount = (amount == null || amount.isBlank())
                ? "N/A"
                : amount;
            String safeAppointmentId = (appointmentId == null || appointmentId.isBlank())
                ? "N/A"
                : appointmentId;

            UserPreferenceClient.NotificationPreferences preferences =
                    userPreferenceClient.getNotificationPreferences(patientId);
            if (!preferences.isPaymentAlertsEnabled()) {
                log.info("Skipping payment notification for user {} due to preference", patientId);
                return;
            }

            if (patientEmail != null && !patientEmail.isBlank()) {
                notificationService.sendNotificationAsync(NotificationRequest.builder()
                        .userId(patientId)
                        .recipientEmail(patientEmail)
                        .type(Notification.NotificationType.PAYMENT_CONFIRMATION)
                        .channel(Notification.NotificationChannel.EMAIL)
                        .subject("Payment Confirmation - Curex Healthcare")
                        .content(buildPaymentConfirmationContent(safePatientName, safeAmount, safeAppointmentId))
                        .build());
            } else {
                log.warn("Skipping payment confirmation email because patient email is unavailable for userId={}", patientId);
            }

            notificationService.sendNotificationAsync(NotificationRequest.builder()
                    .userId(patientId)
                    .type(Notification.NotificationType.PAYMENT_CONFIRMATION)
                    .channel(Notification.NotificationChannel.IN_APP)
                    .subject("Payment Confirmed")
                    .content(String.format("Payment of %s confirmed for appointment %s.",
                            HtmlUtils.htmlEscape(safeAmount),
                            HtmlUtils.htmlEscape(safeAppointmentId)))
                    .build());
        } catch (Exception e) {
            log.error("Failed to process payment.confirmation event: {}", e.getMessage(), e);
        }
    }

    // ── Prescription issued ──────────────────────────────────────────────────

    @RabbitListener(queues = "prescription.issued.queue")
    public void handlePrescriptionIssued(Map<String, Object> event) {
        try {
            log.info("Received prescription.issued event");

            String prescriptionId = (String) event.get("prescriptionId");
            String patientId      = (String) event.get("patientId");
            String patientName    = (String) event.get("patientName");
            String patientEmail   = (String) event.get("patientEmail");
            String doctorName     = (String) event.get("doctorName");
            String doctorUserId   = (String) event.get("doctorUserId");
            String doctorEmail    = (String) event.get("doctorEmail");
            String diagnosis      = (String) event.get("diagnosis");
            String medicines      = (String) event.get("medicines");
            String instructions   = (String) event.get("instructions");
            String validFrom      = event.get("validFrom") != null ? event.get("validFrom").toString() : null;
            String validTo        = event.get("validTo") != null ? event.get("validTo").toString() : null;

            String safeDoctorName  = doctorName != null ? HtmlUtils.htmlEscape(doctorName) : "your doctor";
            String safePatientName = patientName != null ? HtmlUtils.htmlEscape(patientName) : "Patient";
            String safeRxId        = prescriptionId != null ? HtmlUtils.htmlEscape(prescriptionId) : "—";

            if (patientId != null && !patientId.isBlank()
                    && (patientEmail == null || patientEmail.isBlank())) {
                String resolved = userPreferenceClient.resolveUserEmail(patientId);
                if (resolved != null) {
                    patientEmail = resolved;
                }
            }

            // ── Patient notifications ──────────────────────────────────────

            UserPreferenceClient.NotificationPreferences patientPrefs =
                    userPreferenceClient.getNotificationPreferences(patientId);

            if (patientPrefs.isPrescriptionAlertsEnabled()) {
                // Patient — email
                if (patientEmail != null && !patientEmail.isBlank()) {
                    notificationService.sendNotificationAsync(NotificationRequest.builder()
                            .userId(patientId)
                            .recipientEmail(patientEmail)
                            .type(Notification.NotificationType.PRESCRIPTION_READY)
                            .channel(Notification.NotificationChannel.EMAIL)
                            .subject("New Prescription from Dr. " + safeDoctorName + " - Curex Healthcare")
                            .content(buildPrescriptionPatientEmailContent(
                                    safePatientName, safeDoctorName, medicines, diagnosis,
                                    instructions, validFrom, validTo, safeRxId))
                            .build());
                }

                // Patient — in-app
                String patientInApp = String.format(
                        "Dr. %s has issued a new prescription for you. Medicines: %s",
                        safeDoctorName,
                        HtmlUtils.htmlEscape(truncateText(medicines, 80)));
                notificationService.sendNotificationAsync(NotificationRequest.builder()
                        .userId(patientId)
                        .type(Notification.NotificationType.PRESCRIPTION_READY)
                        .channel(Notification.NotificationChannel.IN_APP)
                        .subject("New Prescription Ready")
                        .content(patientInApp)
                        .build());
            } else {
                log.info("Skipping patient prescription notification for user {} due to preference", patientId);
            }

            // ── Doctor notifications ───────────────────────────────────────

            if (doctorUserId != null && !doctorUserId.isBlank()) {
                UserPreferenceClient.NotificationPreferences doctorPrefs =
                        userPreferenceClient.getNotificationPreferences(doctorUserId);

                if (doctorPrefs.isPrescriptionAlertsEnabled()) {
                    // Doctor — in-app confirmation
                    String doctorInApp = String.format(
                            "Prescription issued for %s — %s",
                            safePatientName,
                            HtmlUtils.htmlEscape(truncateText(medicines, 60)));
                    notificationService.sendNotificationAsync(NotificationRequest.builder()
                            .userId(doctorUserId)
                            .type(Notification.NotificationType.PRESCRIPTION_READY)
                            .channel(Notification.NotificationChannel.IN_APP)
                            .subject("Prescription Issued Successfully")
                            .content(doctorInApp)
                            .build());

                    // Doctor — email confirmation
                    if (doctorEmail != null && !doctorEmail.isBlank()) {
                        notificationService.sendNotificationAsync(NotificationRequest.builder()
                                .userId(doctorUserId)
                                .recipientEmail(doctorEmail)
                                .type(Notification.NotificationType.PRESCRIPTION_READY)
                                .channel(Notification.NotificationChannel.EMAIL)
                                .subject("Prescription Issued — " + safePatientName)
                                .content(buildPrescriptionDoctorEmailContent(
                                        safeDoctorName, safePatientName, medicines, diagnosis,
                                        validFrom, validTo, safeRxId))
                                .build());
                    }
                } else {
                    log.info("Skipping doctor prescription notification for user {} due to preference", doctorUserId);
                }
            }
        } catch (Exception e) {
            log.error("Failed to process prescription.issued event: {}", e.getMessage(), e);
        }
    }

    @RabbitListener(queues = "prescription.cancelled.queue")
    public void handlePrescriptionCancelled(Map<String, Object> event) {
        try {
            log.info("Received prescription.cancelled event");

            String prescriptionId = (String) event.get("prescriptionId");
            String patientId = (String) event.get("patientId");
            String patientName = (String) event.get("patientName");
            String patientEmail = (String) event.get("patientEmail");
            String doctorName = (String) event.get("doctorName");
            String medicines = (String) event.get("medicines");
            String diagnosis = (String) event.get("diagnosis");
            String cancelledAtStr = event.get("cancelledAt") != null
                    ? event.get("cancelledAt").toString()
                    : "";

            if (patientId == null || patientId.isBlank()) {
                log.warn("prescription.cancelled event missing patientId; skipping notifications");
                return;
            }

            String safeDoctorName = doctorName != null ? HtmlUtils.htmlEscape(doctorName) : "your doctor";
            String safePatientName = patientName != null ? HtmlUtils.htmlEscape(patientName) : "Patient";
            String safeRxId = prescriptionId != null ? HtmlUtils.htmlEscape(prescriptionId) : "—";

            if (patientId != null && !patientId.isBlank()
                    && (patientEmail == null || patientEmail.isBlank())) {
                String resolved = userPreferenceClient.resolveUserEmail(patientId);
                if (resolved != null) {
                    patientEmail = resolved;
                }
            }

            UserPreferenceClient.NotificationPreferences patientPrefs =
                    userPreferenceClient.getNotificationPreferences(patientId);

            String patientInApp = String.format(
                    "Dr. %s has cancelled a prescription for you. It will show as cancelled in your prescriptions.",
                    safeDoctorName);
            notificationService.sendNotificationAsync(NotificationRequest.builder()
                    .userId(patientId)
                    .type(Notification.NotificationType.PRESCRIPTION_CANCELLED)
                    .channel(Notification.NotificationChannel.IN_APP)
                    .subject("Prescription cancelled")
                    .content(patientInApp)
                    .build());

            if (patientPrefs.isPrescriptionAlertsEnabled()) {
                if (patientEmail != null && !patientEmail.isBlank()) {
                    notificationService.sendNotificationAsync(NotificationRequest.builder()
                            .userId(patientId)
                            .recipientEmail(patientEmail)
                            .type(Notification.NotificationType.PRESCRIPTION_CANCELLED)
                            .channel(Notification.NotificationChannel.EMAIL)
                            .subject("Prescription cancelled — Dr. " + safeDoctorName + " — Curex Healthcare")
                            .content(buildPrescriptionCancelledPatientEmailContent(
                                    safePatientName, safeDoctorName, safeRxId, medicines, diagnosis,
                                    HtmlUtils.htmlEscape(cancelledAtStr)))
                            .build());
                }
            } else {
                log.info("Skipping patient prescription-cancelled email for user {} due to prescription-alerts preference",
                        patientId);
            }
        } catch (Exception e) {
            log.error("Failed to process prescription.cancelled event: {}", e.getMessage(), e);
        }
    }

    // ── Email / SMS content builders ──────────────────────────────────────────

    private String buildWelcomeEmailContent(String firstName, String userRole) {
        return String.format("""
                <p>Dear %s,</p>
                <p>Welcome to <strong>Curex Healthcare Platform</strong>!</p>
                <p>Your <em>%s</em> account has been created successfully.</p>
                <p>If you have any questions, contact our support team.</p>
                <p>Best regards,<br>The Curex Healthcare Team</p>
                """,
                HtmlUtils.htmlEscape(firstName),
                HtmlUtils.htmlEscape(userRole.toLowerCase()));
    }

    private String buildAppointmentConfirmationContent(String patientName, String doctorName,
                                                       String appointmentDate, String appointmentTime) {
        return String.format("""
                <div style="background:#e7f3ff;padding:15px;border-radius:5px;">
                    <h3>Appointment Confirmed!</h3>
                    <p><strong>Patient:</strong> %s</p>
                    <p><strong>Doctor:</strong> %s</p>
                    <p><strong>Date:</strong> %s</p>
                    <p><strong>Time:</strong> %s</p>
                </div>
                <p>Please arrive 15 minutes before your scheduled appointment time.</p>
                """,
                HtmlUtils.htmlEscape(patientName),
                HtmlUtils.htmlEscape(doctorName),
                HtmlUtils.htmlEscape(appointmentDate),
                HtmlUtils.htmlEscape(appointmentTime));
    }

    private String buildPaymentConfirmationContent(String patientName, String amount, String appointmentId) {
        return String.format("""
                <div style="background:#d4edda;padding:15px;border-radius:5px;">
                    <h3>Payment Confirmed!</h3>
                    <p><strong>Patient:</strong> %s</p>
                    <p><strong>Amount:</strong> %s</p>
                    <p><strong>Appointment ID:</strong> %s</p>
                </div>
                <p>Your appointment is fully confirmed. You will receive a reminder before your appointment.</p>
                """,
                HtmlUtils.htmlEscape(patientName),
                HtmlUtils.htmlEscape(amount),
                HtmlUtils.htmlEscape(appointmentId));
    }

    private String buildOtpEmailContent(String otp) {
        return String.format("""
                <p>Hello,</p>
                <p>Your Curex Healthcare verification code is:</p>
                <div style="background:#e7f3ff;padding:20px;border-radius:8px;text-align:center;margin:15px 0;">
                    <h2 style="margin:0;letter-spacing:8px;font-size:32px;color:#007bff;">%s</h2>
                </div>
                <p>This code is valid for <strong>5 minutes</strong>. Do not share it with anyone.</p>
                <p>If you did not request this code, please ignore this email.</p>
                <p>Best regards,<br>The Curex Healthcare Team</p>
                """, HtmlUtils.htmlEscape(otp));
    }

    private String buildStatusChangedEmailContent(String firstName, String role, String status, String action, String notes) {
        String safeName = (firstName == null || firstName.isBlank()) ? "User" : HtmlUtils.htmlEscape(firstName);
        String safeRole = (role == null || role.isBlank()) ? "account" : HtmlUtils.htmlEscape(role.toLowerCase());
        String safeStatus = (status == null || status.isBlank()) ? "UPDATED" : HtmlUtils.htmlEscape(status);
        String safeAction = (action == null || action.isBlank()) ? "updated" : HtmlUtils.htmlEscape(action.toLowerCase());
        String safeNotes = (notes == null || notes.isBlank())
                ? ""
                : "<p><strong>Admin Note:</strong> " + HtmlUtils.htmlEscape(notes) + "</p>";

        return String.format("""
                <p>Dear %s,</p>
                <p>Your %s status has been %s by an administrator.</p>
                <p><strong>Current Status:</strong> %s</p>
                %s
                <p>If you need help, please contact Curex support.</p>
                <p>Best regards,<br>The Curex Healthcare Team</p>
                """, safeName, safeRole, safeAction, safeStatus, safeNotes);
    }

    private String buildPasswordChangedEmailContent(String firstName, String changedAt) {
        String safeName = (firstName == null || firstName.isBlank()) ? "User" : HtmlUtils.htmlEscape(firstName);
        String safeTime = (changedAt == null || changedAt.isBlank()) ? "just now" : HtmlUtils.htmlEscape(changedAt);

        return String.format("""
                <p>Hi %s,</p>
                <p>Your Curex account password was changed at <strong>%s</strong>.</p>
                <p>If this was you, no action is required.</p>
                <p>If this was not you, please reset your password immediately and contact support.</p>
                <p>Regards,<br>The Curex Security Team</p>
                """, safeName, safeTime);
    }

    // ── Prescription email builders ────────────────────────────────────────

    private String buildPrescriptionCancelledPatientEmailContent(String patientName, String doctorName,
                                                                  String prescriptionId, String medicines,
                                                                  String diagnosis, String cancelledAtDisplay) {
        String safeMedicines = (medicines == null || medicines.isBlank())
                ? "—" : HtmlUtils.htmlEscape(medicines);
        String diagnosisBlock = (diagnosis != null && !diagnosis.isBlank())
                ? "<p><strong>Previous diagnosis / notes:</strong> " + HtmlUtils.htmlEscape(diagnosis) + "</p>" : "";
        String whenBlock = (cancelledAtDisplay == null || cancelledAtDisplay.isBlank())
                ? ""
                : "<p><strong>Cancelled at:</strong> " + cancelledAtDisplay + "</p>";

        return String.format("""
                <p>Dear %s,</p>
                <p><strong>Important:</strong> Dr. %s has <strong>cancelled</strong> a prescription that was on your Curex account.</p>
                <div style="background:#fff3e0;border-left:4px solid #ff9800;padding:15px;border-radius:8px;margin:15px 0;">
                    <h3 style="margin:0 0 10px;">Cancelled prescription</h3>
                    <p><strong>Prescription ID:</strong> %s</p>
                    %s
                    <p><strong>Medicines (were listed as):</strong> %s</p>
                    %s
                </div>
                <p>Do not use this prescription. If you still need treatment, please book a follow-up or contact your doctor through Curex.</p>
                <p>You can review the updated status in your patient dashboard under Prescriptions.</p>
                <p>Best regards,<br>The Curex Healthcare Team</p>
                """, patientName, doctorName, prescriptionId, whenBlock, safeMedicines, diagnosisBlock);
    }

    private String buildPrescriptionPatientEmailContent(String patientName, String doctorName,
                                                         String medicines, String diagnosis,
                                                         String instructions,
                                                         String validFrom, String validTo,
                                                         String prescriptionId) {
        String safeMedicines    = (medicines == null || medicines.isBlank())
                ? "—" : HtmlUtils.htmlEscape(medicines);
        String diagnosisBlock   = (diagnosis != null && !diagnosis.isBlank())
                ? "<p><strong>Diagnosis:</strong> " + HtmlUtils.htmlEscape(diagnosis) + "</p>" : "";
        String instructionBlock = (instructions != null && !instructions.isBlank())
                ? "<p><strong>Instructions:</strong> " + HtmlUtils.htmlEscape(instructions) + "</p>" : "";
        String validityBlock    = buildValidityBlock(validFrom, validTo);

        return String.format("""
                <p>Dear %s,</p>
                <p>A new prescription has been issued for you by <strong>Dr. %s</strong>.</p>
                <div style="background:#e8f5e9;padding:15px;border-radius:8px;margin:15px 0;">
                    <h3 style="margin:0 0 10px;">Prescription Details</h3>
                    <p><strong>Prescription ID:</strong> %s</p>
                    <p><strong>Medicines:</strong> %s</p>
                    %s
                    %s
                    %s
                </div>
                %s
                <p>You can view this prescription anytime by logging in to your Curex dashboard.</p>
                <p>Best regards,<br>The Curex Healthcare Team</p>
                """, patientName, doctorName, prescriptionId, safeMedicines,
                diagnosisBlock, instructionBlock, validityBlock,
                buildMedicineDetailBlock(medicines));
    }

    private String buildPrescriptionDoctorEmailContent(String doctorName, String patientName,
                                                        String medicines, String diagnosis,
                                                        String validFrom, String validTo,
                                                        String prescriptionId) {
        String safeMedicines  = (medicines == null || medicines.isBlank())
                ? "—" : HtmlUtils.htmlEscape(medicines);
        String diagnosisBlock = (diagnosis != null && !diagnosis.isBlank())
                ? "<p><strong>Diagnosis:</strong> " + HtmlUtils.htmlEscape(diagnosis) + "</p>" : "";
        String validityBlock  = buildValidityBlock(validFrom, validTo);

        return String.format("""
                <p>Dear Dr. %s,</p>
                <p>This is a confirmation that you have successfully issued a prescription.</p>
                <div style="background:#e7f3ff;padding:15px;border-radius:8px;margin:15px 0;">
                    <h3 style="margin:0 0 10px;">Prescription Summary</h3>
                    <p><strong>Prescription ID:</strong> %s</p>
                    <p><strong>Patient:</strong> %s</p>
                    <p><strong>Medicines:</strong> %s</p>
                    %s
                    %s
                </div>
                <p>The patient has been notified and can view this prescription in their dashboard.</p>
                <p>Best regards,<br>Curex Healthcare Platform</p>
                """, doctorName, prescriptionId, patientName, safeMedicines,
                diagnosisBlock, validityBlock);
    }

    private String buildValidityBlock(String validFrom, String validTo) {
        if ((validFrom == null || validFrom.isBlank()) && (validTo == null || validTo.isBlank())) {
            return "";
        }
        StringBuilder sb = new StringBuilder("<p><strong>Valid Period:</strong> ");
        if (validFrom != null && !validFrom.isBlank()) {
            sb.append(HtmlUtils.htmlEscape(validFrom));
        }
        if (validTo != null && !validTo.isBlank()) {
            if (validFrom != null && !validFrom.isBlank()) {
                sb.append(" to ");
            } else {
                sb.append("Until ");
            }
            sb.append(HtmlUtils.htmlEscape(validTo));
        }
        sb.append("</p>");
        return sb.toString();
    }

    private String buildMedicineDetailBlock(String medicines) {
        if (medicines == null || medicines.isBlank()) return "";
        String[] items = medicines.split(";");
        if (items.length <= 1) return "";

        StringBuilder sb = new StringBuilder();
        sb.append("<div style=\"margin:10px 0;\"><strong>Medicine Breakdown:</strong><ul style=\"margin:5px 0;padding-left:20px;\">");
        for (String item : items) {
            String trimmed = item.trim();
            if (!trimmed.isEmpty()) {
                sb.append("<li>").append(HtmlUtils.htmlEscape(trimmed)).append("</li>");
            }
        }
        sb.append("</ul></div>");
        return sb.toString();
    }

    private static String truncateText(String text, int maxLen) {
        if (text == null) return "";
        if (text.length() <= maxLen) return text;
        return text.substring(0, maxLen - 1) + "…";
    }
}
