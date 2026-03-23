package com.healthcare.telemedicine.dto;

import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class CreateSessionRequest {

    // Required when TELEMEDICINE_STUB_MODE=true.
    @Pattern(regexp = "^(?!\\s*$).+", message = "patientId cannot be blank")
    private String patientId;

    // Required when TELEMEDICINE_STUB_MODE=true.
    @Pattern(regexp = "^(?!\\s*$).+", message = "doctorId cannot be blank")
    private String doctorId;

    // When true, an existing active session will be ended and replaced.
    private boolean forceNew = false;
}
