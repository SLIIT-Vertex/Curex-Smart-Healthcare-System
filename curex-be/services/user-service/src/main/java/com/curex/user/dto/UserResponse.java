package com.curex.user.dto;

import com.curex.user.entity.User;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
public class UserResponse {

    private String id;
    private String email;
    private String firstName;
    private String lastName;
    private String phoneNumber;
    private User.Role role;
    private User.AccountStatus accountStatus;
    private Boolean emailVerified;
    private String approvedBy;
    private String approvalNotes;
    private LocalDateTime approvalDate;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // ── Profile fields ───────────────────────────────────────────────────────

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate dob;
    private String gender;
    private String address;

    // Doctor-specific
    private String specialty;
    private String medicalLicenseNumber;
    private Integer yearsOfExperience;
    private String certifications;

    // Patient-specific
    private String bloodGroup;
    private String allergies;
    private String chronicConditions;
    private String emergencyContactName;
    private String emergencyContactPhone;

    public UserResponse(User user) {
        this.id                   = user.getId();
        this.email                = user.getEmail();
        this.firstName            = user.getFirstName();
        this.lastName             = user.getLastName();
        this.phoneNumber          = user.getPhoneNumber();
        this.role                 = user.getRole();
        this.accountStatus        = user.getAccountStatus();
        this.emailVerified        = user.getEmailVerified();
        this.approvedBy           = user.getApprovedBy();
        this.approvalNotes        = user.getApprovalNotes();
        this.approvalDate         = user.getApprovalDate();
        this.createdAt            = user.getCreatedAt();
        this.updatedAt            = user.getUpdatedAt();
        this.dob                  = user.getDob();
        this.gender               = user.getGender();
        this.address              = user.getAddress();
        this.specialty            = user.getSpecialty();
        this.medicalLicenseNumber = user.getMedicalLicenseNumber();
        this.yearsOfExperience    = user.getYearsOfExperience();
        this.certifications       = user.getCertifications();
        this.bloodGroup           = user.getBloodGroup();
        this.allergies            = user.getAllergies();
        this.chronicConditions    = user.getChronicConditions();
        this.emergencyContactName  = user.getEmergencyContactName();
        this.emergencyContactPhone = user.getEmergencyContactPhone();
    }
}
