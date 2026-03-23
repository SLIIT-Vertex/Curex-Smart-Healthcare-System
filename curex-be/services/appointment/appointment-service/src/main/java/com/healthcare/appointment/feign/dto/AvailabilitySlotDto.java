package com.healthcare.appointment.feign.dto;

import lombok.Data;

import java.time.DayOfWeek;
import java.time.LocalTime;

/** Mirrors the DoctorAvailability entity on the doctor-service side */
@Data
public class AvailabilitySlotDto {
    private String id;
    private String doctorId;
    private DayOfWeek day;
    private LocalTime startTime;
    private LocalTime endTime;
    private boolean booked;
}
