package com.healthcare.telemedicine.events;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SessionCreatedEvent {

    private String appointmentId;
    private String sessionId;
    private String sessionUrl;
    private String patientId;
    private String doctorId;
    private LocalDateTime startedAt;
}
