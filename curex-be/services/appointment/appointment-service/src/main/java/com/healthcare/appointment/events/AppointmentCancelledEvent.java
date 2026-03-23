package com.healthcare.appointment.events;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

/** Published when an appointment is cancelled */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AppointmentCancelledEvent implements Serializable {
    private String appointmentId;
    private String patientEmail;
    private String patientName;
    private String doctorName;
    private String cancellationReason;
}
