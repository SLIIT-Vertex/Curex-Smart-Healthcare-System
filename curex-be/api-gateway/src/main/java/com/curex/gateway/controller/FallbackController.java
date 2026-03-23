package com.curex.gateway.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Circuit breaker fallback endpoints. Spring Cloud Gateway forwards here when
 * a downstream service is unavailable (circuit open) instead of returning a
 * raw connection error to the client.
 */
@RestController
@RequestMapping("/fallback")
public class FallbackController {

    @GetMapping("/service-unavailable")
    public ResponseEntity<Map<String, Object>> serviceUnavailable() {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of(
                "status", 503,
                "error", "Service Unavailable",
                "message", "The requested service is temporarily unavailable. Please try again later."
        ));
    }
}
