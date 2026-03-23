package com.healthcare.appointment.dto;

import com.healthcare.appointment.entity.AppointmentStatus;
import lombok.Data;

@Data
public class UpdateAppointmentRequest {

    /** Change scheduled time (only allowed if status is PENDING) */
    private String newAppointmentTime; // ISO-8601 string, parsed in service

    /** Reason for cancellation */
    private String cancellationReason;

    /** Directly set a new status (used internally / admin) */
    private AppointmentStatus status;
}
