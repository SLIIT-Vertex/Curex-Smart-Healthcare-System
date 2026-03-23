package com.curex.gateway.filter;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Set;

/**
 * Global authentication filter — runs on every request before routing.
 *
 * Flow:
 *  1. Strip X-User-* headers sent by the client (prevents header injection).
 *  2. If the route is on the public whitelist → forward unchanged.
 *  3. Extract Bearer token from Authorization header.
 *  4. Validate JWT locally (signature + expiry) — no network call to user-service.
 *  5. Add X-User-Id, X-User-Role, X-User-Email to the forwarded request so
 *     downstream services can trust user identity without any JWT knowledge.
 *
 * Highest precedence (Ordered.HIGHEST_PRECEDENCE) ensures this runs before
 * any other filters.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AuthenticationFilter implements GlobalFilter, Ordered {

    private static final String BEARER_PREFIX = "Bearer ";

    /**
     * Headers set by the gateway — downstream services trust these.
     * Any client-supplied values are stripped before the gateway adds its own.
     */
    static final String HEADER_USER_ID    = "X-User-Id";
    static final String HEADER_USER_ROLE  = "X-User-Role";
    static final String HEADER_USER_EMAIL = "X-User-Email";

    /**
     * Routes that do not require a valid JWT token.
     * Exact path matching: register, login, refresh, validate, health, actuator.
     */
    private static final Set<String> PUBLIC_PATHS = Set.of(
            "/api/auth/register",
            "/api/auth/login",
            "/api/auth/refresh",
            "/api/auth/validate",
            "/api/auth/health",
            "/api/admin/health",
            "/actuator/health",
            "/fallback/service-unavailable"
    );

    private final JwtUtil jwtUtil;

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        String path = request.getURI().getPath();

        // Always strip client-provided identity headers regardless of route.
        // This prevents a malicious client from spoofing user identity.
        ServerHttpRequest sanitizedRequest = request.mutate()
                .headers(headers -> {
                    headers.remove(HEADER_USER_ID);
                    headers.remove(HEADER_USER_ROLE);
                    headers.remove(HEADER_USER_EMAIL);
                })
                .build();

        // Public routes bypass JWT validation.
        if (isPublicPath(path)) {
            log.debug("Public route, skipping auth: {}", path);
            return chain.filter(exchange.mutate().request(sanitizedRequest).build());
        }

        // Extract Authorization header.
        String authHeader = request.getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
        if (!StringUtils.hasText(authHeader) || !authHeader.startsWith(BEARER_PREFIX)) {
            log.warn("Missing or malformed Authorization header for path: {}", path);
            return unauthorizedResponse(exchange, "Authorization header is required");
        }

        String token = authHeader.substring(BEARER_PREFIX.length());

        // Validate JWT locally — cryptographic check, no network call.
        if (!jwtUtil.isTokenValid(token)) {
            log.warn("Invalid or expired JWT for path: {}", path);
            return unauthorizedResponse(exchange, "Token is invalid or expired");
        }

        // Extract verified identity claims from the token.
        String userId = jwtUtil.extractUserId(token);
        String role   = jwtUtil.extractRole(token);
        String email  = jwtUtil.extractEmail(token);

        log.debug("Authenticated user={} role={} path={}", email, role, path);

        // Forward the request with trusted identity headers injected by the gateway.
        ServerHttpRequest enrichedRequest = sanitizedRequest.mutate()
                .header(HEADER_USER_ID,    userId != null ? userId : "")
                .header(HEADER_USER_ROLE,  role   != null ? role   : "")
                .header(HEADER_USER_EMAIL, email  != null ? email  : "")
                .build();

        return chain.filter(exchange.mutate().request(enrichedRequest).build());
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE;
    }

    /**
     * Returns true if the request path matches a public (no-auth) route.
     * Checks exact match and prefix match for actuator paths.
     */
    private boolean isPublicPath(String path) {
        if (PUBLIC_PATHS.contains(path)) {
            return true;
        }
        // Allow /actuator/** sub-paths (health details, info, etc.)
        return path.startsWith("/actuator/");
    }

    private Mono<Void> unauthorizedResponse(ServerWebExchange exchange, String message) {
        ServerHttpResponse response = exchange.getResponse();
        response.setStatusCode(HttpStatus.UNAUTHORIZED);
        response.getHeaders().setContentType(MediaType.APPLICATION_JSON);

        String body = """
                {"status":401,"error":"Unauthorized","message":"%s"}
                """.formatted(message).strip();

        return response.writeWith(
                Mono.just(response.bufferFactory().wrap(body.getBytes()))
        );
    }
}
