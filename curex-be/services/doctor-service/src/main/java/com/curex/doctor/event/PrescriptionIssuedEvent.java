package com.curex.doctor.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PrescriptionIssuedEvent {

    private String prescriptionId;
    private String doctorId;
    private String doctorName;
    private String patientId;
    private String patientEmail;
    private String medicines;
    private LocalDate validFrom;
    private LocalDate validTo;
    private LocalDateTime issuedAt;
}
