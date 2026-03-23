package com.healthcare.appointment.dto;

import com.healthcare.appointment.entity.AppointmentType;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class BookAppointmentRequest {

    // In real flow these come from JWT headers forwarded by API Gateway;
    // for testing without auth service, send them in the request body.
    @NotBlank(message = "patientId is required")
        @Pattern(
            regexp = "^(?!.*\\{\\{)(?!.*\\}\\}).+",
            message = "patientId contains unresolved template variables"
        )
    private String patientId;

    @NotBlank(message = "patientName is required")
    private String patientName;

    @NotBlank(message = "patientEmail is required")
    private String patientEmail;

    @NotBlank(message = "doctorId is required")
        @Pattern(
            regexp = "^(?!.*\\{\\{)(?!.*\\}\\}).+",
            message = "doctorId contains unresolved template variables"
        )
    private String doctorId;

    @NotBlank(message = "doctorName is required")
    private String doctorName;

    @NotBlank(message = "doctorSpecialty is required")
    private String doctorSpecialty;

    // Optional – if doctor-service is integrated, the slot will be validated there
    private String slotId;

    @NotNull(message = "appointmentTime is required")
    @Future(message = "appointmentTime must be in the future")
    private LocalDateTime appointmentTime;

    @NotNull(message = "type is required (IN_PERSON or TELEMEDICINE)")
    private AppointmentType type;

    private String notes;
}
