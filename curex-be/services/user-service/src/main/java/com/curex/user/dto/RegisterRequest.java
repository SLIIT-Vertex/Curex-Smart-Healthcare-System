package com.curex.user.dto;

import com.curex.user.entity.User;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RegisterRequest {

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
     * This enforces that the phone number has been verified before account creation.
     */
    @NotBlank(message = "Phone verification is required. Please complete OTP verification.")
    private String phoneVerificationToken;

    /**
     * Token returned by {@code POST /api/auth/otp/verify}.
     * Must be valid and match the supplied {@code email}.
     * This enforces that the email address has been verified before account creation.
     */
    @NotBlank(message = "Email verification is required. Please complete OTP verification.")
    private String emailVerificationToken;
}
