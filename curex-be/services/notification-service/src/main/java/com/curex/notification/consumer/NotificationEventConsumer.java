package com.curex.notification.consumer;

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

    // ── Doctor approval ───────────────────────────────────────────────────────

    @RabbitListener(queues = "doctor.approval.queue")
    public void handleDoctorApproval(Map<String, Object> event) {
        try {
            log.info("Received doctor.approval event");

            String doctorId  = (String) event.get("doctorId");
            String email     = (String) event.get("email");
            String firstName = (String) event.get("firstName");
            String status    = (String) event.get("status");
            String notes     = (String) event.get("notes");

            boolean approved = "APPROVED".equals(status);

            notificationService.sendNotificationAsync(NotificationRequest.builder()
                    .userId(doctorId)
                    .recipientEmail(email)
                    .type(approved
                            ? Notification.NotificationType.DOCTOR_APPROVAL
                            : Notification.NotificationType.DOCTOR_REJECTION)
                    .channel(Notification.NotificationChannel.EMAIL)
                    .subject(approved
                            ? "Congratulations! Your doctor account has been approved"
                            : "Update on your doctor application")
                    .content(approved
                            ? buildDoctorApprovalContent(firstName)
                            : buildDoctorRejectionContent(firstName, notes))
                    .build());
        } catch (Exception e) {
            log.error("Failed to process doctor.approval event: {}", e.getMessage(), e);
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

            if (patientEmail != null && !patientEmail.isBlank()) {
                notificationService.sendNotificationAsync(NotificationRequest.builder()
                        .userId(patientId)
                        .recipientEmail(patientEmail)
                        .type(Notification.NotificationType.PAYMENT_CONFIRMATION)
                        .channel(Notification.NotificationChannel.EMAIL)
                        .subject("Payment Confirmation - Curex Healthcare")
                        .content(buildPaymentConfirmationContent(patientName, amount, appointmentId))
                        .build());
            }

            notificationService.sendNotificationAsync(NotificationRequest.builder()
                    .userId(patientId)
                    .type(Notification.NotificationType.PAYMENT_CONFIRMATION)
                    .channel(Notification.NotificationChannel.IN_APP)
                    .subject("Payment Confirmed")
                    .content(String.format("Payment of %s confirmed for appointment %s.",
                            HtmlUtils.htmlEscape(amount),
                            HtmlUtils.htmlEscape(appointmentId)))
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

            String patientId      = (String) event.get("patientId");
            String patientEmail   = (String) event.get("patientEmail");
            String doctorName     = (String) event.get("doctorName");
            String prescriptionId = (String) event.get("prescriptionId");

            String content = String.format("A new prescription from Dr. %s is ready. Prescription ID: %s.",
                    HtmlUtils.htmlEscape(doctorName),
                    HtmlUtils.htmlEscape(prescriptionId));

            if (patientEmail != null && !patientEmail.isBlank()) {
                notificationService.sendNotificationAsync(NotificationRequest.builder()
                        .userId(patientId)
                        .recipientEmail(patientEmail)
                        .type(Notification.NotificationType.PRESCRIPTION_READY)
                        .channel(Notification.NotificationChannel.EMAIL)
                        .subject("Prescription Ready - Curex Healthcare")
                        .content("<p>" + content + "</p>")
                        .build());
            }

            notificationService.sendNotificationAsync(NotificationRequest.builder()
                    .userId(patientId)
                    .type(Notification.NotificationType.PRESCRIPTION_READY)
                    .channel(Notification.NotificationChannel.IN_APP)
                    .subject("Prescription Ready")
                    .content(content)
                    .build());
        } catch (Exception e) {
            log.error("Failed to process prescription.issued event: {}", e.getMessage(), e);
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

    private String buildDoctorApprovalContent(String firstName) {
        return String.format("""
                <p>Dear Dr. %s,</p>
                <p>Congratulations! Your doctor account has been approved.</p>
                <p>You can now log in and start:</p>
                <ul>
                    <li>Managing your appointment schedule</li>
                    <li>Conducting video consultations</li>
                    <li>Accessing patient records</li>
                    <li>Issuing digital prescriptions</li>
                </ul>
                <p>Welcome to the Curex Healthcare family!</p>
                """,
                HtmlUtils.htmlEscape(firstName));
    }

    private String buildDoctorRejectionContent(String firstName, String notes) {
        String escapedNotes = (notes != null && !notes.isBlank())
                ? "<p><strong>Reason:</strong> " + HtmlUtils.htmlEscape(notes) + "</p>"
                : "";
        return String.format("""
                <p>Dear Dr. %s,</p>
                <p>Thank you for your interest in joining Curex Healthcare Platform.</p>
                <p>After reviewing your application, we are unable to approve your account at this time.</p>
                %s
                <p>You are welcome to reapply once you meet our requirements.</p>
                <p>If you have questions, please contact our support team.</p>
                """,
                HtmlUtils.htmlEscape(firstName),
                escapedNotes);
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
}
