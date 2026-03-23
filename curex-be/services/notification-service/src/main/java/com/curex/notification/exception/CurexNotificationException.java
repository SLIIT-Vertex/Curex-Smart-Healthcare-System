package com.curex.notification.exception;

import org.springframework.http.HttpStatus;

public class CurexNotificationException extends RuntimeException {

    private final HttpStatus status;

    public CurexNotificationException(String message, HttpStatus status) {
        super(message);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
