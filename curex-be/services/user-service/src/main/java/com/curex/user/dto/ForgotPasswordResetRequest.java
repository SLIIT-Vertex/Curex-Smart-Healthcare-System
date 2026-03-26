package com.curex.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ForgotPasswordResetRequest {

    @NotBlank(message = "Identifier is required")
    private String identifier;

    @NotNull(message = "Channel is required")
    private ForgotPasswordChannel channel;

    @NotBlank(message = "Verification token is required")
    private String verificationToken;

    @NotBlank(message = "New password is required")
    @Size(min = 8, message = "Password must be at least 8 characters long")
    private String newPassword;
}
