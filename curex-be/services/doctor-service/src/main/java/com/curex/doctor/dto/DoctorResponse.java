package com.curex.doctor.dto;

import lombok.*;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DoctorResponse {

    private String id;
    private String firstName;
    private String lastName;
    private String email;
    private String phone;
    private String specialization;
    private String qualifications;
    private Integer experience;
    private BigDecimal consultationFee;
    private String bio;
    private String avatarUrl;
    private boolean verified;
}
