package com.curex.user.exception;

import org.springframework.http.HttpStatus;

public class InvalidCredentialsException extends CurexUserException {

    public InvalidCredentialsException() {
        super("Invalid email or password", HttpStatus.UNAUTHORIZED);
    }
}
