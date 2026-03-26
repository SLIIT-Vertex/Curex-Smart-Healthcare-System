package com.curex.user.controller;

import com.curex.user.dto.UpdateProfileRequest;
import com.curex.user.dto.UserResponse;
import com.curex.user.dto.NotificationPreferencesRequest;
import com.curex.user.dto.NotificationPreferencesResponse;
import com.curex.user.entity.User;
import com.curex.user.service.UserProfileService;
import com.curex.user.service.UserQueryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * User lookup endpoints for any authenticated user.
 *
 * All public-facing methods enforce APPROVED status — suspended, pending, or
 * rejected accounts are invisible to regular users.
 *
 * Internal endpoints (/api/internal/users/**) are network-isolated: they are
 * not exposed via the API Gateway and are only reachable by other microservices
 * on the same Docker / Kubernetes network.
 *
 * Endpoint summary
 * ────────────────────────────────────────────────────────────────────────
 * GET /api/users/me                     — own profile (any status)
 * GET /api/users/{id}                   — approved user by ID
 * GET /api/users?name=&role=&page=&size — paginated search (approved only)
 * GET /api/users/approved               — all approved users (optional ?role=)
 * GET /api/users/approved/by-role/{role}— approved users by role
 * GET /api/users/doctors                — all approved doctors
 * GET /api/users/patients               — all approved patients
 *
 * GET /api/internal/users/{id}          — any user by ID  (no auth, internal only)
 * GET /api/internal/users/by-email/{e}  — any user by email (internal only)
 * GET /api/internal/users/by-role/{r}   — any users by role (internal only)
 * GET /api/internal/users/approved/by-role/{r} — APPROVED users only (internal, for doctor-service etc.)
 */
@RestController
@RequiredArgsConstructor
public class UserController {

    private final UserQueryService userQueryService;
    private final UserProfileService userProfileService;

    // ── Own profile ──────────────────────────────────────────────────────────

    @GetMapping("/api/users/me")
    public ResponseEntity<UserResponse> getMyProfile() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        UserDetails userDetails = (UserDetails) auth.getPrincipal();
        return ResponseEntity.ok(userQueryService.getOwnProfile(userDetails.getUsername()));
    }

    /**
     * Update the authenticated user's profile.
     *
     * All fields are optional — only non-null values in the request body are applied.
     * Typically called immediately after registration to persist dob, gender, address,
     * and role-specific details (doctor credentials / patient health info).
     *
     * PUT /api/users/me/profile
     */
    @PutMapping("/api/users/me/profile")
    public ResponseEntity<UserResponse> updateMyProfile(@Valid @RequestBody UpdateProfileRequest request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        UserDetails userDetails = (UserDetails) auth.getPrincipal();
        return ResponseEntity.ok(userProfileService.updateProfile(userDetails.getUsername(), request));
    }

    @GetMapping("/api/users/me/preferences/notifications")
    public ResponseEntity<NotificationPreferencesResponse> getMyNotificationPreferences() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        UserDetails userDetails = (UserDetails) auth.getPrincipal();
        return ResponseEntity.ok(userProfileService.getNotificationPreferencesByEmail(userDetails.getUsername()));
    }

    @PutMapping("/api/users/me/preferences/notifications")
    public ResponseEntity<NotificationPreferencesResponse> updateMyNotificationPreferences(
            @RequestBody NotificationPreferencesRequest request
    ) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        UserDetails userDetails = (UserDetails) auth.getPrincipal();
        return ResponseEntity.ok(userProfileService.updateNotificationPreferences(userDetails.getUsername(), request));
    }

    // ── Approved-user endpoints ──────────────────────────────────────────────

    /**
     * Paginated, filterable search across approved users.
     * ?name=John   — matches first name, last name, or email (case-insensitive)
     * ?role=DOCTOR — filter by role
     * ?page=0&size=10
     */
    @GetMapping("/api/users")
    public ResponseEntity<Map<String, Object>> searchUsers(
            @RequestParam(required = false) String name,
            @RequestParam(required = false) User.Role role,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        Page<UserResponse> result = userQueryService.searchApprovedUsers(name, role, page, size);
        return ResponseEntity.ok(Map.of(
                "users",       result.getContent(),
                "currentPage", result.getNumber(),
                "totalItems",  result.getTotalElements(),
                "totalPages",  result.getTotalPages(),
                "hasNext",     result.hasNext(),
                "hasPrevious", result.hasPrevious()
        ));
    }

    /** Get one approved user by ID. Returns 404 if not approved. */
    @GetMapping("/api/users/{id}")
    public ResponseEntity<UserResponse> getUserById(@PathVariable String id) {
        return ResponseEntity.ok(userQueryService.getApprovedUserById(id));
    }

    /**
     * All approved users, optionally filtered by role.
     * GET /api/users/approved
     * GET /api/users/approved?role=DOCTOR
     */
    @GetMapping("/api/users/approved")
    public ResponseEntity<List<UserResponse>> getApprovedUsers(
            @RequestParam(required = false) User.Role role) {

        if (role != null) {
            return ResponseEntity.ok(userQueryService.getApprovedUsersByRole(role));
        }
        // No role filter — return all approved users across all roles
        List<UserResponse> all = userQueryService.getApprovedUsersByRole(User.Role.PATIENT);
        all.addAll(userQueryService.getApprovedUsersByRole(User.Role.DOCTOR));
        all.addAll(userQueryService.getApprovedUsersByRole(User.Role.ADMIN));
        return ResponseEntity.ok(all);
    }

    /** Approved users of a specific role. */
    @GetMapping("/api/users/approved/by-role/{role}")
    public ResponseEntity<List<UserResponse>> getApprovedUsersByRole(@PathVariable User.Role role) {
        return ResponseEntity.ok(userQueryService.getApprovedUsersByRole(role));
    }

    /** All approved doctors — shortcut used by appointment/telemedicine services. */
    @GetMapping("/api/users/doctors")
    public ResponseEntity<List<UserResponse>> getApprovedDoctors() {
        return ResponseEntity.ok(userQueryService.getApprovedDoctors());
    }

    /** All approved patients. */
    @GetMapping("/api/users/patients")
    public ResponseEntity<List<UserResponse>> getApprovedPatients() {
        return ResponseEntity.ok(userQueryService.getApprovedPatients());
    }

    // ── Internal / service-to-service endpoints ──────────────────────────────
    // NOT exposed via the API Gateway — only reachable on the internal network.
    // No JWT required because the caller is a trusted microservice on the same network.

    /** Look up any user by ID regardless of status (for other microservices). */
    @GetMapping("/api/internal/users/{id}")
    public ResponseEntity<UserResponse> getInternalUserById(@PathVariable String id) {
        return ResponseEntity.ok(userQueryService.getAnyUserById(id));
    }

    @GetMapping("/api/internal/users/{id}/preferences/notifications")
    public ResponseEntity<NotificationPreferencesResponse> getInternalNotificationPreferences(@PathVariable String id) {
        return ResponseEntity.ok(userProfileService.getNotificationPreferencesByUserId(id));
    }

    /** Look up any user by email regardless of status (for other microservices). */
    @GetMapping("/api/internal/users/by-email/{email}")
    public ResponseEntity<UserResponse> getInternalUserByEmail(@PathVariable String email) {
        return ResponseEntity.ok(userQueryService.getAnyUserByEmail(email));
    }

    /** All users of a role regardless of status (for other microservices). */
    @GetMapping("/api/internal/users/by-role/{role}")
    public ResponseEntity<List<UserResponse>> getInternalUsersByRole(@PathVariable User.Role role) {
        return ResponseEntity.ok(userQueryService.getAllUsersByRole(role));
    }

    /** Approved users of a role only — service-to-service (e.g. doctor-service filters bookable doctors). */
    @GetMapping("/api/internal/users/approved/by-role/{role}")
    public ResponseEntity<List<UserResponse>> getInternalApprovedUsersByRole(@PathVariable User.Role role) {
        return ResponseEntity.ok(userQueryService.getApprovedUsersByRole(role));
    }
}
