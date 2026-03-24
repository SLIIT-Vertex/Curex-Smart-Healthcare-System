package com.curex.doctor.dto;

import lombok.*;

import java.time.DayOfWeek;
import java.time.LocalTime;

/**
 * Matches appointment-service's AvailabilitySlotDto for Feign compatibility.
 * Field 'booked' (not isBooked) ensures JSON serialization matches M4's expectation.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AvailabilitySlotResponse {

    private String id;
    private String doctorId;
    private DayOfWeek day;
    private LocalTime startTime;
    private LocalTime endTime;

    /** Matches AvailabilitySlotDto.booked field name */
    private boolean booked;
}
