package com.curex.patient.dto;

import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PatientResponse {

    private String id;
    private String name;
    private String email;
    private String phone;
    private LocalDate dateOfBirth;
    private String gender;
    private String bloodType;
    private String address;
    private String avatarUrl;
    private LocalDateTime createdAt;
    private MedicalHistoryResponse medicalHistory;
    private EmergencyContactResponse emergencyContact;
}
