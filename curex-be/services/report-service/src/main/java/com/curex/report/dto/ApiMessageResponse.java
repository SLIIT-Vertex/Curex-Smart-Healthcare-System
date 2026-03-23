package com.curex.report.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.time.Instant;

@Getter
@AllArgsConstructor
@Builder
public class ApiMessageResponse {

    private final Instant timestamp;
    private final String message;

    public static ApiMessageResponse of(String message) {
        return ApiMessageResponse.builder()
                .timestamp(Instant.now())
                .message(message)
                .build();
    }
}
