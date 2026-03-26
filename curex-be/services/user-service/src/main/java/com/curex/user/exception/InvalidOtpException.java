package com.curex.user.exception;

import org.springframework.http.HttpStatus;

public class InvalidOtpException extends CurexUserException {

    public InvalidOtpException(String message) {
        super(message, HttpStatus.BAD_REQUEST);
    }
}
