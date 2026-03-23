package com.curex.payment.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.time.Instant;

@Getter
@AllArgsConstructor
@Builder
public class ApiResponse<T> {

    private final Instant timestamp;
    private final String message;
    private final T data;

    public static <T> ApiResponse<T> of(String message, T data) {
        return ApiResponse.<T>builder()
                .timestamp(Instant.now())
                .message(message)
                .data(data)
                .build();
    }
}
