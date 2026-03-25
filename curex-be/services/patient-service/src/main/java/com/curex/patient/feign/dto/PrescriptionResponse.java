package com.curex.patient.feign.dto;

import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Mirrors doctor-service PrescriptionResponse for Feign compatibility.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PrescriptionResponse {

    private String id;
    private String doctorId;
    private String doctorName;
    private String doctorSpecialty;
    private String patientId;
    private String patientName;
    private String appointmentId;
    private String diagnosis;
    private String medicines;
    private String instructions;
    private LocalDate validFrom;
    private LocalDate validTo;
    private String status;
    private LocalDateTime issuedAt;
}
