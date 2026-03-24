package com.curex.patient.dto;

import com.curex.patient.entity.Gender;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdatePatientRequest {

    @NotBlank(message = "First name is required")
    private String firstName;

    @NotBlank(message = "Last name is required")
    private String lastName;

    private String phone;

    private LocalDate dateOfBirth;

    private Gender gender;

    private String bloodType;

    private String address;
}
