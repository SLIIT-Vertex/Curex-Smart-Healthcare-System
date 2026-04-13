package com.healthcare.appointment.events;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.LocalDateTime;

/** Published after a new appointment is booked → consumed by Notification Service */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AppointmentBookedEvent implements Serializable {
    private String appointmentId;
    private String patientEmail;
    private String patientName;
    private String doctorName;
    private LocalDateTime appointmentTime;
    private String appointmentType;  // IN_PERSON | TELEMEDICINE
}
