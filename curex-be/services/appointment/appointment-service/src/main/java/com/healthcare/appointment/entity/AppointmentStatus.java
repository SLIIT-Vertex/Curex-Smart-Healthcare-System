package com.healthcare.appointment.entity;

public enum AppointmentStatus {
    PENDING,        // just booked, awaiting payment
    CONFIRMED,      // payment done
    IN_SESSION,     // video session started
    COMPLETED,      // session/visit finished
    CANCELLED       // cancelled by patient or doctor
}
