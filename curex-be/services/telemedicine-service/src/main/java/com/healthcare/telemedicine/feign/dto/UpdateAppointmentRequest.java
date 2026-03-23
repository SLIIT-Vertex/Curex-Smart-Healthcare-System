package com.healthcare.telemedicine.feign.dto;

import lombok.Data;

@Data
public class UpdateAppointmentRequest {

    private AppointmentStatus status;
}
