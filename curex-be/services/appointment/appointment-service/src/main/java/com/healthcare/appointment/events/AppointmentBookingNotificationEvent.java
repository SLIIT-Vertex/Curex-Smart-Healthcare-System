package com.healthcare.appointment.events;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

/**
 * Event payload published for notification-service appointment booking flow.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AppointmentBookingNotificationEvent implements Serializable {

    private String appointmentId;
    private String patientId;
    private String patientEmail;
    private String patientName;
    private String doctorName;
    private String appointmentDate;
    private String appointmentTime;
}
