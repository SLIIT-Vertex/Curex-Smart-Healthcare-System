package com.healthcare.telemedicine.feign.dto;

import lombok.Data;

@Data
public class AppointmentSummary {

    private String id;
    private String patientId;
    private String doctorId;
    private AppointmentStatus status;
    private AppointmentType type;
}
