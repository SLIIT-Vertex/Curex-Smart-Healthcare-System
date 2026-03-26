package com.curex.user.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class ForgotPasswordVerifyOtpResponse {
    private String verificationToken;
    private String message;
}
