package com.curex.doctor.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import lombok.*;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateDoctorRequest {

    private String firstName;

    private String lastName;

    @Email(message = "Please provide a valid email address")
    private String email;

    private String phone;

    private String specialization;

    private String qualifications;

    private String medicalLicenseNumber;

    private String proofDocumentUrls;

    @Min(value = 0, message = "Experience must be non-negative")
    private Integer experience;

    @DecimalMin(value = "0.0", message = "Consultation fee must be non-negative")
    private BigDecimal consultationFee;

    private String bio;
}
