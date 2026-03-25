package com.curex.user.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * Request body for {@code PUT /api/users/me/profile}.
 *
 * All fields are optional — only non-null values are applied to the user record.
 * This keeps registration lean (identity-only) while allowing the frontend to
 * submit supplementary profile data immediately after account creation.
 */
@Data
@NoArgsConstructor
public class UpdateProfileRequest {

    // ── Basic identity (all optional — null means no change) ─────────────────

    @Size(max = 100, message = "First name must be at most 100 characters")
    private String firstName;

    @Size(max = 100, message = "Last name must be at most 100 characters")
    private String lastName;

    @Size(max = 30, message = "Phone number must be at most 30 characters")
    private String phoneNumber;

    @Size(max = 500, message = "Profile image URL must be at most 500 characters")
    private String profileImageUrl;

    // ── Common profile fields ─────────────────────────────────────────────────

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate dob;

    @Size(max = 20, message = "Gender must be at most 20 characters")
    private String gender;

    @Size(max = 500, message = "Address must be at most 500 characters")
    private String address;

    @Size(max = 2000, message = "Bio must be at most 2000 characters")
    private String bio;

    // ── Doctor-specific ──────────────────────────────────────────────────────

    @Size(max = 100, message = "Specialty must be at most 100 characters")
    private String specialty;

    @Size(max = 100, message = "Medical licence number must be at most 100 characters")
    private String medicalLicenseNumber;

    @Min(value = 0, message = "Years of experience must be non-negative")
    private Integer yearsOfExperience;

    @Size(max = 1000, message = "Certifications must be at most 1000 characters")
    private String certifications;

    @Size(max = 2000, message = "Proof document URLs must be at most 2000 characters")
    private String proofDocumentUrls;

    // ── Patient-specific ─────────────────────────────────────────────────────

    @Size(max = 10, message = "Blood group must be at most 10 characters")
    private String bloodGroup;

    @Size(max = 500, message = "Allergies must be at most 500 characters")
    private String allergies;

    @Size(max = 500, message = "Chronic conditions must be at most 500 characters")
    private String chronicConditions;

    @Size(max = 200, message = "Emergency contact name must be at most 200 characters")
    private String emergencyContactName;

    @Size(max = 30, message = "Emergency contact phone must be at most 30 characters")
    private String emergencyContactPhone;
}
