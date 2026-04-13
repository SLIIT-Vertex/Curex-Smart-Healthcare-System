package com.curex.gateway.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.server.reactive.ServerHttpRequest;
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

    @RequestMapping("/service-unavailable")
    public ResponseEntity<Map<String, Object>> serviceUnavailable(ServerHttpRequest request) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of(
                "status", 503,
                "error", "Service Unavailable",
                "message", "The requested service is temporarily unavailable. Please try again later.",
                "method", request.getMethod() != null ? request.getMethod().name() : "UNKNOWN",
                "path", request.getPath().value()
        ));
    }
}
