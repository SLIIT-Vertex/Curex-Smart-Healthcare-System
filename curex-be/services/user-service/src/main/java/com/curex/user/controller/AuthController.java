package com.curex.user.controller;

import com.curex.user.dto.AuthResponse;
import com.curex.user.dto.LoginRequest;
import com.curex.user.dto.RegisterRequest;
import com.curex.user.dto.SendOtpRequest;
import com.curex.user.dto.VerifyOtpRequest;
import com.curex.user.dto.VerifyOtpResponse;
import com.curex.user.entity.User;
import com.curex.user.exception.EmailAlreadyExistsException;
import com.curex.user.service.AuthService;
import com.curex.user.service.OtpService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final OtpService otpService;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.ok(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refreshToken(@RequestBody Map<String, String> request) {
        String refreshToken = request.get("refreshToken");
        return ResponseEntity.ok(authService.refreshToken(refreshToken));
    }

    @PostMapping("/validate")
    public ResponseEntity<Map<String, Object>> validateToken(@RequestBody Map<String, String> request) {
        String token   = request.get("token");
        boolean isValid = authService.validateToken(token);
        return ResponseEntity.ok(Map.of("valid", isValid));
    }

    @GetMapping("/profile")
    public ResponseEntity<AuthResponse.UserInfo> getCurrentUser() {
        Authentication auth        = SecurityContextHolder.getContext().getAuthentication();
        UserDetails userDetails    = (UserDetails) auth.getPrincipal();
        User user                  = authService.getUserByEmail(userDetails.getUsername());
        return ResponseEntity.ok(new AuthResponse.UserInfo(user));
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout() {
        return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of("status", "UP", "service", "user-service"));
    }

    // ── OTP endpoints ─────────────────────────────────────────────────────────

    /**
     * Generates and dispatches 6-digit OTPs to both the supplied phone number (via SMS)
     * and the supplied email address (via email). Each gets an independent OTP code.
     * Idempotent — calling again before the codes expire replaces the previous codes.
     * No authentication required (used during the registration flow).
     */
    @PostMapping("/otp/send")
    public ResponseEntity<Map<String, String>> sendOtp(@Valid @RequestBody SendOtpRequest request) {
        if (authService.emailExists(request.getEmail())) {
            throw new EmailAlreadyExistsException(request.getEmail());
        }

        otpService.sendPhoneOtp(request.getPhoneNumber());
        otpService.sendEmailOtp(request.getEmail());

        return ResponseEntity.ok(Map.of(
                "message", "OTP sent to " + request.getPhoneNumber() + " and " + request.getEmail(),
                "expiresInMinutes", "5"
        ));
    }

    /**
     * Verifies OTP codes for both phone number and email address.
     * On success, returns short-lived verification tokens for both that must be included
     * in the subsequent {@code POST /api/auth/register} call.
     */
    @PostMapping("/otp/verify")
    public ResponseEntity<VerifyOtpResponse> verifyOtp(@Valid @RequestBody VerifyOtpRequest request) {
        String phoneToken = otpService.verifyPhoneOtp(request.getPhoneNumber(), request.getOtpCode());
        String emailToken = otpService.verifyEmailOtp(request.getEmail(), request.getEmailOtpCode());

        return ResponseEntity.ok(new VerifyOtpResponse(phoneToken, emailToken));
    }
}
