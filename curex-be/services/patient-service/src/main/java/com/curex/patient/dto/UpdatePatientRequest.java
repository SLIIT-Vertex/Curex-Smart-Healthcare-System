package com.curex.patient.dto;

import com.curex.patient.entity.Gender;
import lombok.*;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdatePatientRequest {

    private String firstName;

    private String lastName;

    private String phone;

    private LocalDate dateOfBirth;

    private Gender gender;

    private String bloodType;

    private String address;
}
