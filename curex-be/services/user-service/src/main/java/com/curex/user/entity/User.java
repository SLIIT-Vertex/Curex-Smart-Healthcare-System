package com.curex.user.entity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@EntityListeners(AuditingEntityListener.class)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(unique = true, nullable = false)
    @Email(message = "Please provide a valid email address")
    @NotBlank(message = "Email is required")
    private String email;

    @Column(nullable = false)
    @NotBlank(message = "Password is required")
    @Size(min = 8, message = "Password must be at least 8 characters long")
    private String password;

    @Column(name = "first_name", nullable = false)
    @NotBlank(message = "First name is required")
    private String firstName;

    @Column(name = "last_name", nullable = false)
    @NotBlank(message = "Last name is required")
    private String lastName;

    @Column(name = "phone_number")
    private String phoneNumber;

    @Column(name = "profile_image_url", length = 500)
    private String profileImageUrl;

    // ── Profile fields (populated via PUT /api/users/me/profile after registration) ──

    @Column(name = "date_of_birth")
    private LocalDate dob;

    @Column(name = "gender", length = 20)
    private String gender;

    @Column(name = "address", length = 500)
    private String address;

    @Column(name = "bio", length = 2000)
    private String bio;

    // Doctor-specific profile fields
    @Column(name = "specialty", length = 100)
    private String specialty;

    @Column(name = "medical_license_number", length = 100)
    private String medicalLicenseNumber;

    @Column(name = "years_of_experience")
    private Integer yearsOfExperience;

    @Column(name = "certifications", length = 1000)
    private String certifications;

    @Column(name = "proof_document_urls", length = 2000)
    private String proofDocumentUrls;

    // Patient-specific profile fields
    @Column(name = "blood_group", length = 10)
    private String bloodGroup;

    @Column(name = "allergies", length = 500)
    private String allergies;

    @Column(name = "chronic_conditions", length = 500)
    private String chronicConditions;

    @Column(name = "emergency_contact_name", length = 200)
    private String emergencyContactName;

    @Column(name = "emergency_contact_phone", length = 30)
    private String emergencyContactPhone;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    @Enumerated(EnumType.STRING)
    @Column(name = "account_status")
    private AccountStatus accountStatus = AccountStatus.PENDING;

    @Column(name = "email_verified")
    private Boolean emailVerified = false;

    @Column(name = "approved_by")
    private String approvedBy;

    @Column(name = "approval_notes")
    private String approvalNotes;

    @Column(name = "approval_date")
    private LocalDateTime approvalDate;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // Custom constructor for registration
    public User(String email, String password, String firstName, String lastName, Role role) {
        this.email = email;
        this.password = password;
        this.firstName = firstName;
        this.lastName = lastName;
        this.role = role;
        this.accountStatus = role == Role.PATIENT ? AccountStatus.APPROVED : AccountStatus.PENDING;
        this.emailVerified = false;
    }

    // Business logic methods
    public boolean isActive() {
        return accountStatus == AccountStatus.APPROVED;
    }

    public boolean isPending() {
        return accountStatus == AccountStatus.PENDING;
    }

    public boolean needsApproval() {
        return role == Role.DOCTOR && accountStatus == AccountStatus.PENDING;
    }

    public String getFullName() {
        return firstName + " " + lastName;
    }

    // Enums
    public enum Role {
        PATIENT,
        DOCTOR,
        ADMIN
    }

    public enum AccountStatus {
        PENDING,
        APPROVED,
        REJECTED,
        SUSPENDED
    }
}