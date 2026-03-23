package com.curex.user.exception;

import org.springframework.http.HttpStatus;

public class EmailAlreadyExistsException extends CurexUserException {

    public EmailAlreadyExistsException(String email) {
        super("An account with email '" + email + "' already exists", HttpStatus.CONFLICT);
    }
}
