package com.curex.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class ForgotPasswordVerifyOtpRequest {

    @NotBlank(message = "Identifier is required")
    private String identifier;

    @NotNull(message = "Channel is required")
    private ForgotPasswordChannel channel;

    @NotBlank(message = "OTP code is required")
    @Pattern(regexp = "\\d{6}", message = "OTP must be exactly 6 digits")
    private String otpCode;
}
