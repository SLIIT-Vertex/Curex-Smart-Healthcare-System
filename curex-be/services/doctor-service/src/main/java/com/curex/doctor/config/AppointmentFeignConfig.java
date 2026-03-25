package com.curex.doctor.config;

import feign.RequestInterceptor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;

/**
 * Appointment-service expects {@code X-User-Id} / {@code X-User-Role} (same contract as the API gateway).
 * Feign calls are server-to-server; use a dedicated internal identity with ADMIN read access for
 * prescription validation fetches. Restrict network access to appointment-service in production.
 */
public class AppointmentFeignConfig {

    @Bean
    public RequestInterceptor appointmentServiceUserHeaders(
            @Value("${curex.feign.appointment-service.user-id:doctor-service-internal}") String userId,
            @Value("${curex.feign.appointment-service.user-role:ADMIN}") String userRole) {
        return requestTemplate -> {
            requestTemplate.header("X-User-Id", userId);
            requestTemplate.header("X-User-Role", userRole);
        };
    }
}
