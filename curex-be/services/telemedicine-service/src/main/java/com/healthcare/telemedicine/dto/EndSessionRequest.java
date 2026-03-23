package com.healthcare.telemedicine.dto;

import lombok.Data;

@Data
public class EndSessionRequest {

    private String endedBy;
    private String notes;
    private boolean markAppointmentCompleted = true;
}
