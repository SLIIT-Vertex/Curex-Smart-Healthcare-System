package com.curex.notification.dto;

import com.curex.notification.entity.Notification;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationRequest {

    @NotNull(message = "User ID is required")
    private String userId;

    private String recipientEmail;

    private String recipientPhone;

    @NotNull(message = "Notification type is required")
    private Notification.NotificationType type;

    @NotNull(message = "Notification channel is required")
    private Notification.NotificationChannel channel;

    @NotBlank(message = "Subject is required")
    private String subject;

    private String content;

    private String templateName;

    private Map<String, Object> templateData;

    @Builder.Default
    private Integer maxAttempts = 3;
}
