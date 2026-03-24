package com.healthcare.appointment.feign.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Mirrors doctor-service {@code BookableDoctorResponse} for Feign.
 */
@Data
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class BookableDoctorDto {

    private String userId;
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
