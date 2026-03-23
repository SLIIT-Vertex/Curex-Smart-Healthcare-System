package com.curex.gateway.exception;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.web.reactive.error.ErrorWebExceptionHandler;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Global exception handler for the reactive API Gateway.
 *
 * Intercepts unhandled exceptions (including Spring Security and routing errors)
 * and returns a consistent JSON error payload instead of the default HTML error page.
 *
 * Ordered at -1 so it runs after Spring Boot's DefaultErrorWebExceptionHandler
 * (order = -2) but before the default Netty handler.
 */
@Slf4j
@Order(-1)
@Component
@RequiredArgsConstructor
public class GatewayExceptionHandler implements ErrorWebExceptionHandler {

    private final ObjectMapper objectMapper;

    @Override
    public Mono<Void> handle(ServerWebExchange exchange, Throwable ex) {
        ServerHttpResponse response = exchange.getResponse();
        response.getHeaders().setContentType(MediaType.APPLICATION_JSON);

        HttpStatus status = resolveStatus(ex);
        response.setStatusCode(status);

        String path = exchange.getRequest().getURI().getPath();
        log.warn("Gateway error on {}: {} — {}", path, ex.getClass().getSimpleName(), ex.getMessage());

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", LocalDateTime.now().toString());
        body.put("status", status.value());
        body.put("error", status.getReasonPhrase());
        body.put("message", resolveMessage(ex, status));
        body.put("path", path);

        try {
            byte[] bytes = objectMapper.writeValueAsBytes(body);
            return response.writeWith(Mono.just(response.bufferFactory().wrap(bytes)));
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize error response", e);
            return response.setComplete();
        }
    }

    private HttpStatus resolveStatus(Throwable ex) {
        if (ex instanceof ResponseStatusException rse) {
            return HttpStatus.valueOf(rse.getStatusCode().value());
        }
        return HttpStatus.INTERNAL_SERVER_ERROR;
    }

    private String resolveMessage(Throwable ex, HttpStatus status) {
        if (ex instanceof ResponseStatusException rse && rse.getReason() != null) {
            return rse.getReason();
        }
        return switch (status) {
            case UNAUTHORIZED       -> "Authentication required";
            case FORBIDDEN          -> "Access denied";
            case NOT_FOUND          -> "The requested resource was not found";
            case SERVICE_UNAVAILABLE -> "Service is temporarily unavailable";
            default                 -> "An unexpected error occurred";
        };
    }
}
