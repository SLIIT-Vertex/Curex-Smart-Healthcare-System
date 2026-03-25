package com.curex.user.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class VerifyOtpResponse {

    /** One-time token that proves the phone number has been verified. Must be included in the registration request. */
    private String verificationToken;

    /** One-time token that proves the email has been verified. Must be included in the registration request. */
    private String emailVerificationToken;

    private String message;

    public VerifyOtpResponse(String verificationToken, String emailVerificationToken) {
        this.verificationToken = verificationToken;
        this.emailVerificationToken = emailVerificationToken;
        this.message = "Phone and email verified successfully.";
    }
}
