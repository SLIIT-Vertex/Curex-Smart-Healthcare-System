package com.curex.user.exception;

import org.springframework.http.HttpStatus;

public class PhoneVerificationRequiredException extends CurexUserException {

    public PhoneVerificationRequiredException() {
        super("Phone number must be verified before registration. Please complete OTP verification.", HttpStatus.BAD_REQUEST);
    }
}
