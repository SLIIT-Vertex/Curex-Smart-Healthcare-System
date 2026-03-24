package com.curex.patient.exception;

public class PatientAlreadyExistsException extends RuntimeException {

    public PatientAlreadyExistsException(String message) {
        super(message);
    }
}
