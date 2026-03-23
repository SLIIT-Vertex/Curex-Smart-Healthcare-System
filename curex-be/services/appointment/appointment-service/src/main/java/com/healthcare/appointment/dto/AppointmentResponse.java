package com.healthcare.appointment.dto;

import com.healthcare.appointment.entity.AppointmentStatus;
import com.healthcare.appointment.entity.AppointmentType;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class AppointmentResponse {

    private String id;
    private String patientId;
    private String patientName;
    private String patientEmail;
    private String doctorId;
    private String doctorName;
    private String doctorSpecialty;
    private String slotId;
    private LocalDateTime appointmentTime;
    private AppointmentStatus status;
    private AppointmentType type;
    private String paymentId;
    private String sessionUrl;
    private String notes;
    private String cancellationReason;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
