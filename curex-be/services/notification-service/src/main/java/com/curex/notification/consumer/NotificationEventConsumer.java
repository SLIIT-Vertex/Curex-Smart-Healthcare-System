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

            notificationService.sendNotificationAsync(NotificationRequest.builder()
                    .userId(patientId)
                    .recipientEmail(patientEmail)
                    .type(Notification.NotificationType.APPOINTMENT_CONFIRMATION)
                    .channel(Notification.NotificationChannel.EMAIL)
                    .subject("Appointment Confirmation - Curex Healthcare")
                    .content(buildAppointmentConfirmationContent(patientName, doctorName,
                            appointmentDate, appointmentTime))
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

            notificationService.sendNotificationAsync(NotificationRequest.builder()
                    .userId(patientId)
                    .recipientEmail(patientEmail)
                    .type(Notification.NotificationType.PAYMENT_CONFIRMATION)
                    .channel(Notification.NotificationChannel.EMAIL)
                    .subject("Payment Confirmation - Curex Healthcare")
                    .content(buildPaymentConfirmationContent(patientName, amount, appointmentId))
                    .build());
        } catch (Exception e) {
            log.error("Failed to process payment.confirmation event: {}", e.getMessage(), e);
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
}
