package com.curex.user.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class VerifyOtpRequest {

    @NotBlank(message = "Phone number is required")
    private String phoneNumber;

    @NotBlank(message = "Phone OTP code is required")
    @Pattern(regexp = "\\d{6}", message = "Phone OTP must be exactly 6 digits")
    private String otpCode;

    @NotBlank(message = "Email is required")
    @Email(message = "Please provide a valid email address")
    private String email;

    @NotBlank(message = "Email OTP code is required")
    @Pattern(regexp = "\\d{6}", message = "Email OTP must be exactly 6 digits")
    private String emailOtpCode;
}
