package com.curex.doctor.feign.dto;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * Mirrors appointment-service AppointmentResponse for Feign compatibility.
 */
@Data
public class AppointmentResponseDto {

    private String id;
    private String patientId;
    private String patientName;
    private String patientEmail;
    private String doctorId;
    private String doctorName;
    private String doctorSpecialty;
    private String slotId;
    private LocalDateTime appointmentTime;
    private String status;  // PENDING, CONFIRMED, IN_SESSION, COMPLETED, CANCELLED
    private String type;    // IN_PERSON, TELEMEDICINE
    private String paymentId;
    private String sessionUrl;
    private String notes;
}
