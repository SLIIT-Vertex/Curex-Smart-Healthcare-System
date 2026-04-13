package com.curex.user.exception;

import org.springframework.http.HttpStatus;

public class AccountNotActiveException extends CurexUserException {

    public AccountNotActiveException(String reason) {
        super("Account access denied: " + reason, HttpStatus.FORBIDDEN);
    }
}
