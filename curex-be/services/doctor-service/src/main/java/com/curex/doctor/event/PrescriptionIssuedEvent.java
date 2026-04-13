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
    private String doctorUserId;
    private String doctorName;
    private String doctorEmail;
    private String patientId;
    private String patientName;
    private String patientEmail;
    private String appointmentId;
    /** {@code IN_SESSION} or {@code COMPLETED} from the appointment at issue time. */
    private String visitStatusAtIssue;
    private String diagnosis;
    private String medicines;
    private String instructions;
    private LocalDate validFrom;
    private LocalDate validTo;
    private LocalDateTime issuedAt;
}
