package com.healthcare.appointment.dto;

import lombok.Data;

@Data
public class SearchDoctorRequest {

    private String specialty;          // e.g. "Cardiology"
    private String name;               // partial doctor name search
    private String date;               // ISO date "2026-04-10"
    private String appointmentType;    // IN_PERSON | TELEMEDICINE | (blank = any)
}
