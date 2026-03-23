package com.curex.user.exception;

import org.springframework.http.HttpStatus;

public class CurexUserException extends RuntimeException {

    private final HttpStatus status;

    public CurexUserException(String message, HttpStatus status) {
        super(message);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
