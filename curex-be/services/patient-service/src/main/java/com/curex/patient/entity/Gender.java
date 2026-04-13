package com.curex.patient.entity;

import com.fasterxml.jackson.annotation.JsonCreator;

import java.util.Locale;

public enum Gender {
    MALE,
    FEMALE,
    OTHER;

    @JsonCreator
    public static Gender fromValue(String value) {
        if (value == null) {
            return null;
        }

        String normalized = value.trim();
        if (normalized.isEmpty()) {
            return null;
        }

        return Gender.valueOf(normalized.toUpperCase(Locale.ROOT));
    }
}
