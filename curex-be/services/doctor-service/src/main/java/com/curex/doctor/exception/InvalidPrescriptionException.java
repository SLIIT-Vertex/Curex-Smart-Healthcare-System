package com.curex.doctor.exception;

public class InvalidPrescriptionException extends RuntimeException {

    public InvalidPrescriptionException(String message) {
        super(message);
    }
}
