package com.healthcare.telemedicine.dto;

import com.healthcare.telemedicine.entity.SessionStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class SessionResponse {

    private String id;
    private String appointmentId;
    private String patientId;
    private String doctorId;
    private String roomName;
    private String sessionUrl;
    private SessionStatus status;
    private LocalDateTime startedAt;
    private LocalDateTime endedAt;
    private String endedBy;
    private String notes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
