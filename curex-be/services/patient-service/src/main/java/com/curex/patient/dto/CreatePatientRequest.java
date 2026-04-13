package com.curex.patient.dto;

import com.curex.patient.entity.Gender;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreatePatientRequest {

    @NotBlank(message = "User ID is required")
    private String userId;

    private LocalDate dateOfBirth;

    private Gender gender;

    private String bloodType;

    private String address;
}
