package com.curex.notification.service;

import com.curex.notification.entity.Notification;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

@Service
public class EmailService {

    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);

    @Autowired
    private JavaMailSender mailSender;

    @Autowired
    private TemplateEngine templateEngine;

    @Value("${notification.email.from:noreply@curex.healthcare}")
    private String fromEmail;

    @Value("${notification.email.from-name:Curex Healthcare}")
    private String fromName;

    /**
     * Send email notification
     */
    public boolean sendEmail(Notification notification) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            // Set email details
            helper.setFrom(fromEmail, fromName);
            helper.setTo(notification.getRecipientEmail());
            helper.setSubject(notification.getSubject());

            // Generate email content
            String emailContent = generateEmailContent(notification);
            helper.setText(emailContent, true); // true indicates HTML content

            // Send email
            mailSender.send(message);

            logger.info("Email sent successfully to: {}", notification.getRecipientEmail());
            return true;

        } catch (Exception e) {
            logger.error("Failed to send email to: {}. Error: {}",
                        notification.getRecipientEmail(), e.getMessage());
            return false;
        }
    }

    /**
     * Generate email content from template or direct content
     */
    private String generateEmailContent(Notification notification) {
        if (notification.getTemplateName() != null && !notification.getTemplateName().isEmpty()) {
            // Use template engine
            return generateFromTemplate(notification);
        } else {
            // Use direct content with basic HTML formatting
            return wrapInBasicHtmlTemplate(notification.getContent(), notification.getSubject());
        }
    }

    /**
     * Generate email content from Thymeleaf template
     */
    private String generateFromTemplate(Notification notification) {
        try {
            Context context = new Context();

            // Parse template data if available
            if (notification.getTemplateData() != null) {
                // Assuming template data is stored as JSON string
                // In a real implementation, you'd parse this JSON
                context.setVariable("data", notification.getTemplateData());
            }

            // Add common variables
            context.setVariable("subject", notification.getSubject());
            context.setVariable("content", notification.getContent());

            return templateEngine.process(notification.getTemplateName(), context);

        } catch (Exception e) {
            logger.warn("Failed to process template: {}. Using fallback content.",
                       notification.getTemplateName());
            return wrapInBasicHtmlTemplate(notification.getContent(), notification.getSubject());
        }
    }

    /**
     * Wrap content in basic HTML template
     */
    private String wrapInBasicHtmlTemplate(String content, String subject) {
        return String.format("""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>%s</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; }
                    .container { max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 20px; border-radius: 8px; }
                    .header { background: #007bff; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                    .content { background: white; padding: 30px; border-radius: 0 0 8px 8px; }
                    .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Curex Healthcare</h1>
                    </div>
                    <div class="content">
                        <h2>%s</h2>
                        <div>%s</div>
                    </div>
                    <div class="footer">
                        <p>This is an automated message from Curex Healthcare Platform.</p>
                        <p>If you have questions, please contact our support team.</p>
                    </div>
                </div>
            </body>
            </html>
            """, subject, subject, content);
    }

    /**
     * Get welcome email template content
     */
    public String getWelcomeEmailContent(String firstName, String userType) {
        return String.format("""
            <p>Dear %s,</p>
            <p>Welcome to Curex Healthcare Platform!</p>
            <p>Your %s account has been created successfully. You can now access our platform to:</p>
            <ul>
                %s
            </ul>
            <p>If you have any questions, please don't hesitate to contact our support team.</p>
            <p>Best regards,<br>The Curex Healthcare Team</p>
            """, firstName, userType, getUserTypeFeatures(userType));
    }

    /**
     * Get appointment confirmation email content
     */
    public String getAppointmentConfirmationContent(String patientName, String doctorName,
                                                   String appointmentDate, String appointmentTime) {
        return String.format("""
            <p>Dear %s,</p>
            <p>Your appointment has been confirmed!</p>
            <div style="background: #e7f3ff; padding: 15px; border-radius: 5px; margin: 15px 0;">
                <h3>Appointment Details:</h3>
                <p><strong>Doctor:</strong> %s</p>
                <p><strong>Date:</strong> %s</p>
                <p><strong>Time:</strong> %s</p>
            </div>
            <p>Please make sure to arrive 15 minutes before your scheduled time.</p>
            <p>Best regards,<br>The Curex Healthcare Team</p>
            """, patientName, doctorName, appointmentDate, appointmentTime);
    }

    /**
     * Get user type specific features for welcome email
     */
    private String getUserTypeFeatures(String userType) {
        return switch (userType.toUpperCase()) {
            case "PATIENT" -> """
                <li>Book appointments with verified doctors</li>
                <li>Access your medical records</li>
                <li>Receive AI-powered health insights</li>
                <li>Join video consultations</li>
                """;
            case "DOCTOR" -> """
                <li>Manage your appointment schedule</li>
                <li>Conduct video consultations</li>
                <li>Access patient records</li>
                <li>Issue digital prescriptions</li>
                """;
            case "ADMIN" -> """
                <li>Manage platform users</li>
                <li>Review doctor applications</li>
                <li>Monitor platform analytics</li>
                <li>Oversee system operations</li>
                """;
            default -> """
                <li>Access your dashboard</li>
                <li>Manage your profile</li>
                <li>Use platform features</li>
                """;
        };
    }
}