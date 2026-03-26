package com.curex.user.exception;

import org.springframework.http.HttpStatus;

public class InvalidPasswordChangeException extends CurexUserException {

    public InvalidPasswordChangeException(String message) {
        super(message, HttpStatus.BAD_REQUEST);
    }
}