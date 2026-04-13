package com.curex.doctor.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateDoctorRequest {

    @NotBlank(message = "User ID is required")
    private String userId;

    @NotBlank(message = "First name is required")
    private String firstName;

    @NotBlank(message = "Last name is required")
    private String lastName;

    @NotBlank(message = "Email is required")
    @Email(message = "Please provide a valid email address")
    private String email;

    private String phone;

    @NotBlank(message = "Specialization is required")
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
