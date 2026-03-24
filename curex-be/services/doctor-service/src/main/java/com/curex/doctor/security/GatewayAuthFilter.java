package com.curex.doctor.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * Downstream service authentication filter.
 * The API Gateway validates the JWT and injects X-User-Id / X-User-Role / X-User-Email headers.
 * This filter reads those headers and populates the Spring SecurityContext.
 * No JWT library or shared secret is needed here — security is enforced by Docker network
 * isolation: only the gateway can reach this service on the internal network.
 */
@Slf4j
@Component
public class GatewayAuthFilter extends OncePerRequestFilter {

    static final String HEADER_USER_ID    = "X-User-Id";
    static final String HEADER_USER_ROLE  = "X-User-Role";
    static final String HEADER_USER_EMAIL = "X-User-Email";

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {

        String userId = request.getHeader(HEADER_USER_ID);
        String role   = request.getHeader(HEADER_USER_ROLE);
        String email  = request.getHeader(HEADER_USER_EMAIL);

        if (StringUtils.hasText(userId) && StringUtils.hasText(role)) {
            List<SimpleGrantedAuthority> authorities =
                    List.of(new SimpleGrantedAuthority("ROLE_" + role));

            UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(email, null, authorities);

            request.setAttribute("userId", userId);
            SecurityContextHolder.getContext().setAuthentication(authentication);
            log.debug("Gateway-authenticated user={} role={} path={}", email, role, request.getRequestURI());
        }

        filterChain.doFilter(request, response);
    }
}
