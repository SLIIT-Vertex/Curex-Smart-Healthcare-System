package com.curex.user.controller;

import com.curex.user.dto.PlatformStatistics;
import com.curex.user.dto.UserApprovalRequest;
import com.curex.user.dto.UserResponse;
import com.curex.user.entity.User;
import com.curex.user.service.AdminService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AdminService adminService;

    @GetMapping("/users")
    public ResponseEntity<Map<String, Object>> getAllUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) User.Role role,
            @RequestParam(required = false) User.AccountStatus status,
            @RequestParam(required = false) String search) {

        Page<UserResponse> users = adminService.getAllUsers(page, size, role, status, search);
        return ResponseEntity.ok(Map.of(
                "users", users.getContent(),
                "currentPage", users.getNumber(),
                "totalItems", users.getTotalElements(),
                "totalPages", users.getTotalPages(),
                "hasNext", users.hasNext(),
                "hasPrevious", users.hasPrevious()
        ));
    }

    /**
     * Get user by ID. NOTE: declared BEFORE /users/by-role/{role} to avoid Spring MVC
     * treating "by-role" as a userId value at startup.
     */
    @GetMapping("/users/{userId}")
    public ResponseEntity<UserResponse> getUserById(@PathVariable String userId) {
        return ResponseEntity.ok(adminService.getUserById(userId));
    }

    @GetMapping("/doctors/pending")
    public ResponseEntity<List<UserResponse>> getPendingDoctors() {
        return ResponseEntity.ok(adminService.getPendingDoctors());
    }

    @PutMapping("/users/{userId}/status")
    public ResponseEntity<UserResponse> updateUserStatus(
            @PathVariable String userId,
            @Valid @RequestBody UserApprovalRequest request,
            @RequestHeader("X-User-Id") String adminId) {

        return ResponseEntity.ok(adminService.updateUserStatus(userId, request, adminId));
    }

    @PutMapping("/users/bulk-status")
    public ResponseEntity<List<UserResponse>> bulkUpdateUserStatus(
            @Valid @RequestBody BulkStatusRequest request,
            @RequestHeader("X-User-Id") String adminId) {

        UserApprovalRequest approvalRequest = new UserApprovalRequest(request.action(), request.notes());
        return ResponseEntity.ok(adminService.bulkUpdateUsers(request.userIds(), approvalRequest, adminId));
    }

    /** Uses /by-role prefix to avoid collision with /users/{userId} path variable. */
    @GetMapping("/users/by-role/{role}")
    public ResponseEntity<List<UserResponse>> getUsersByRole(@PathVariable User.Role role) {
        return ResponseEntity.ok(adminService.getUsersByRole(role));
    }

    /** Uses /by-status prefix to avoid collision with /users/{userId} path variable. */
    @GetMapping("/users/by-status/{status}")
    public ResponseEntity<List<UserResponse>> getUsersByStatus(@PathVariable User.AccountStatus status) {
        return ResponseEntity.ok(adminService.getUsersByStatus(status));
    }

    /** Soft-suspends the user account. Records are retained for audit purposes. */
    @DeleteMapping("/users/{userId}")
    public ResponseEntity<Map<String, String>> suspendUser(
            @PathVariable String userId,
            @RequestHeader("X-User-Id") String adminId) {

        adminService.suspendUser(userId, adminId);
        return ResponseEntity.ok(Map.of("message", "User account suspended successfully"));
    }

    @GetMapping("/statistics")
    public ResponseEntity<PlatformStatistics> getPlatformStatistics() {
        return ResponseEntity.ok(adminService.getPlatformStatistics());
    }

    @GetMapping("/statistics/counts")
    public ResponseEntity<Map<String, Long>> getCountStatistics() {
        return ResponseEntity.ok(adminService.getCountStatistics());
    }

    @GetMapping("/users/registered")
    public ResponseEntity<List<UserResponse>> getUsersRegisteredBetween(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {

        return ResponseEntity.ok(adminService.getUsersRegisteredBetween(startDate, endDate));
    }

    @GetMapping("/health")
    @PreAuthorize("permitAll()")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "service", "user-service",
                "timestamp", String.valueOf(System.currentTimeMillis())
        ));
    }

    /** Inner record replacing the old BulkStatusUpdateRequest DTO. */
    public record BulkStatusRequest(
            List<String> userIds,
            UserApprovalRequest.ApprovalAction action,
            String notes) {
    }
}
