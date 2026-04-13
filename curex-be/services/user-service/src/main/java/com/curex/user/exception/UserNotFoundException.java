package com.curex.user.exception;

import org.springframework.http.HttpStatus;

public class UserNotFoundException extends CurexUserException {

    public UserNotFoundException(String identifier) {
        super("User not found: " + identifier, HttpStatus.NOT_FOUND);
    }
}
