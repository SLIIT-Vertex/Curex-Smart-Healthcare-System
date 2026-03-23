package com.curex.user.exception;

import org.springframework.http.HttpStatus;

public class AdminRegistrationForbiddenException extends CurexUserException {

    public AdminRegistrationForbiddenException() {
        super("Self-registration with ADMIN role is not permitted", HttpStatus.FORBIDDEN);
    }
}
