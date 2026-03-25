package com.curex.doctor.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IssuePrescriptionRequest {

    @NotNull(message = "Doctor ID is required")
    @NotBlank(message = "Doctor ID cannot be blank")
    private String doctorId;

    @NotNull(message = "Patient ID is required")
    @NotBlank(message = "Patient ID cannot be blank")
    private String patientId;

    @NotNull(message = "Appointment ID is required - prescriptions only allowed for ongoing or completed appointments")
    @NotBlank(message = "Appointment ID cannot be blank")
    private String appointmentId;

    /** Optional: used for prescription.issued notification email */
    private String patientEmail;

    /** Optional: patient name from appointment for display (used if provided) */
    private String patientName;

    /** Optional: diagnosis or clinical notes */
    private String diagnosis;

    @NotNull(message = "Medicines are required")
    @NotBlank(message = "Medicines cannot be blank")
    private String medicines;

    private String instructions;

    @NotNull(message = "Valid from date is required")
    private LocalDate validFrom;

    @NotNull(message = "Valid to date is required")
    private LocalDate validTo;
}
