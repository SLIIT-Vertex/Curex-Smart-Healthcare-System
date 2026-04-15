package com.curex.user.dto;

import com.curex.user.entity.User;
import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RegisterRequest {

    // ── Required identity fields ──────────────────────────────────────────────

    @NotBlank(message = "Email is required")
    @Email(message = "Please provide a valid email address")
    private String email;

    @NotBlank(message = "Password is required")
    @Size(min = 8, message = "Password must be at least 8 characters long")
    private String password;

    @NotBlank(message = "First name is required")
    private String firstName;

    @NotBlank(message = "Last name is required")
    private String lastName;

    @NotBlank(message = "Phone number is required")
    private String phoneNumber;

    @NotNull(message = "Role is required")
    private User.Role role;

    /**
     * Token returned by {@code POST /api/auth/otp/verify}.
     * Must be valid and match the supplied {@code phoneNumber}.
     */
    @NotBlank(message = "Phone verification is required. Please complete OTP verification.")
    private String phoneVerificationToken;

    /**
     * Token returned by {@code POST /api/auth/otp/verify}.
     * Must be valid and match the supplied {@code email}.
     */
    @NotBlank(message = "Email verification is required. Please complete OTP verification.")
    private String emailVerificationToken;

    // ── Optional profile fields (all roles) ──────────────────────────────────
    // Submitted alongside registration to avoid a second authenticated API call.

    @Size(max = 500)
    private String profileImageUrl;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate dob;

    @Size(max = 20)
    private String gender;

    @Size(max = 500)
    private String address;

    // Compatibility fields retained for FE contract; persisted in doctor/patient services.

    @Size(max = 100)
    private String specialty;

    @Size(max = 100)
    private String medicalLicenseNumber;

    @Min(0)
    private Integer yearsOfExperience;

    @Size(max = 1000)
    private String certifications;

    @Size(max = 2000)
    private String proofDocumentUrls;

    @Size(max = 10)
    private String bloodGroup;

    @Size(max = 500)
    private String allergies;

    @Size(max = 500)
    private String chronicConditions;

    @Size(max = 200)
    private String emergencyContactName;

    @Size(max = 30)
    private String emergencyContactPhone;

}
