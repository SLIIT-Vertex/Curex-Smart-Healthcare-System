package com.curex.user.service;

import com.curex.user.exception.CurexUserException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserDataDeletionOrchestrator {

    private final RestTemplate restTemplate;

    @Value("${services.appointment.url}")
    private String appointmentServiceUrl;

    @Value("${services.doctor.url}")
    private String doctorServiceUrl;

    @Value("${services.patient.url}")
    private String patientServiceUrl;

    @Value("${services.payment.url}")
    private String paymentServiceUrl;

    @Value("${services.notification.url}")
    private String notificationServiceUrl;

    @Value("${services.report.url}")
    private String reportServiceUrl;

    @Value("${services.telemedicine.url}")
    private String telemedicineServiceUrl;

    public void purgeUserDataAcrossServices(String userId) {
        List<String> failures = new ArrayList<>();

        purgeService("appointment-service", appointmentServiceUrl, userId, failures);
        purgeService("telemedicine-service", telemedicineServiceUrl, userId, failures);
        purgeService("payment-service", paymentServiceUrl, userId, failures);
        purgeService("notification-service", notificationServiceUrl, userId, failures);
        purgeService("report-service", reportServiceUrl, userId, failures);
        purgeService("doctor-service", doctorServiceUrl, userId, failures);
        purgeService("patient-service", patientServiceUrl, userId, failures);

        if (!failures.isEmpty()) {
            throw new CurexUserException(
                    "Account deletion failed in dependent services: " + String.join(", ", failures),
                    HttpStatus.BAD_GATEWAY
            );
        }
    }

    private void purgeService(String serviceName, String baseUrl, String userId, List<String> failures) {
        String url = baseUrl + "/api/internal/users/" + userId + "/purge";
        try {
            ResponseEntity<String> response = restTemplate.exchange(
                    url,
                    HttpMethod.DELETE,
                    HttpEntity.EMPTY,
                    String.class
            );

            if (!response.getStatusCode().is2xxSuccessful()) {
                failures.add(serviceName + " (status " + response.getStatusCode().value() + ")");
                return;
            }

            log.info("Purged user {} data in {}", userId, serviceName);
        } catch (RestClientException ex) {
            log.error("Failed to purge user {} data in {}: {}", userId, serviceName, ex.getMessage());
            failures.add(serviceName);
        }
    }
}
