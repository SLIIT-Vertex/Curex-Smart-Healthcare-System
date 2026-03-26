package com.curex.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ForgotPasswordSendOtpRequest {

    @NotBlank(message = "Identifier is required")
    private String identifier;

    @NotNull(message = "Channel is required")
    private ForgotPasswordChannel channel;
}
