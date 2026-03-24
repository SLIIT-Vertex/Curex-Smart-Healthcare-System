package com.curex.doctor.dto;

import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PrescriptionResponse {

    private String id;
    private String doctorId;
    private String doctorName;
    private String patientId;
    private String appointmentId;
    private String medicines;
    private String instructions;
    private LocalDate validFrom;
    private LocalDate validTo;
    private String status;
    private LocalDateTime issuedAt;
}
