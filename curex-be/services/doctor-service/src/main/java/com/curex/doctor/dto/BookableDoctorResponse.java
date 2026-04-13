package com.curex.doctor.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Doctor profile + {@code userId} for appointment booking flows.
 * Returned only for users with {@code APPROVED} account status in user-service.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookableDoctorResponse {

    private String userId;
    private String id;
    private String firstName;
    private String lastName;
    private String email;
    private String phone;
    private String specialization;
    private String qualifications;
    private String medicalLicenseNumber;
    private String proofDocumentUrls;
    private Integer experience;
    private BigDecimal consultationFee;
    private String bio;
    private String avatarUrl;
    private boolean verified;
}
