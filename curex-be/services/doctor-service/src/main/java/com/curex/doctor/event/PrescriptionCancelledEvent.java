package com.curex.doctor.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PrescriptionCancelledEvent {

    private String prescriptionId;
    private String doctorId;
    private String doctorUserId;
    private String doctorName;
    private String doctorEmail;
    private String patientId;
    private String patientName;
    /** May be null; notification-service can resolve from user preferences. */
    private String patientEmail;
    private String diagnosis;
    private String medicines;
    private LocalDateTime cancelledAt;
}
