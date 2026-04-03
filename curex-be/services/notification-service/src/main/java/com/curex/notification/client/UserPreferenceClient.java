package com.curex.notification.client;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

@Slf4j
@Component
@RequiredArgsConstructor
public class UserPreferenceClient {

    private final RestTemplateBuilder restTemplateBuilder;

    @Value("${services.user-service.base-url:http://localhost:8081}")
    private String userServiceBaseUrl;

    /**
     * Resolves the account email for a user id (internal API). Used when domain events omit email.
     */
    public String resolveUserEmail(String userId) {
        if (userId == null || userId.isBlank()) {
            return null;
        }
        String url = userServiceBaseUrl + "/api/internal/users/" + userId.trim();
        RestTemplate restTemplate = restTemplateBuilder.build();
        try {
            ResponseEntity<InternalUserResponse> response =
                    restTemplate.getForEntity(url, InternalUserResponse.class);
            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                return null;
            }
            String email = response.getBody().getEmail();
            return email != null && !email.isBlank() ? email.trim() : null;
        } catch (RestClientException ex) {
            log.warn("Could not resolve email for user {}: {}", userId, ex.getMessage());
            return null;
        }
    }

    public NotificationPreferences getNotificationPreferences(String userId) {
        if (userId == null || userId.isBlank()) {
            return NotificationPreferences.defaults();
        }

        String url = userServiceBaseUrl + "/api/internal/users/" + userId + "/preferences/notifications";
        RestTemplate restTemplate = restTemplateBuilder.build();

        try {
            ResponseEntity<NotificationPreferences> response =
                    restTemplate.getForEntity(url, NotificationPreferences.class);
            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                return NotificationPreferences.defaults();
            }
            return response.getBody().withDefaults();
        } catch (RestClientException ex) {
            log.warn("Could not load notification preferences for user {}: {}", userId, ex.getMessage());
            return NotificationPreferences.defaults();
        }
    }

    @Getter
    public static class NotificationPreferences {
        private String userId;
        private Boolean appointmentReminders;
        private Boolean prescriptionAlerts;
        private Boolean paymentAlerts;
        private Boolean emailDigest;

        public NotificationPreferences withDefaults() {
            if (appointmentReminders == null) appointmentReminders = true;
            if (prescriptionAlerts == null) prescriptionAlerts = true;
            if (paymentAlerts == null) paymentAlerts = true;
            if (emailDigest == null) emailDigest = false;
            return this;
        }

        public static NotificationPreferences defaults() {
            NotificationPreferences p = new NotificationPreferences();
            p.appointmentReminders = true;
            p.prescriptionAlerts = true;
            p.paymentAlerts = true;
            p.emailDigest = false;
            return p;
        }

        public boolean isAppointmentRemindersEnabled() {
            return Boolean.TRUE.equals(appointmentReminders);
        }

        public boolean isPrescriptionAlertsEnabled() {
            return Boolean.TRUE.equals(prescriptionAlerts);
        }

        public boolean isPaymentAlertsEnabled() {
            return Boolean.TRUE.equals(paymentAlerts);
        }
    }

    @Getter
    @Setter
    private static class InternalUserResponse {
        private String email;
    }
}
