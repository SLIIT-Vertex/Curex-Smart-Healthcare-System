package com.curex.user.service;

import com.curex.user.dto.PlatformStatistics;
import com.curex.user.dto.UserApprovalRequest;
import com.curex.user.dto.UserResponse;
import com.curex.user.config.RabbitMQConfig;
import com.curex.user.entity.User;
import com.curex.user.exception.CurexUserException;
import com.curex.user.exception.UserNotFoundException;
import com.curex.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository userRepository;
    private final RabbitTemplate rabbitTemplate;
    private final ProfileBridgeService profileBridgeService;

    @Transactional(readOnly = true)
    public Page<UserResponse> getAllUsers(int page, int size, User.Role role,
                                         User.AccountStatus status, String searchTerm) {
        Pageable pageable = PageRequest.of(page, size);
        String normalizedSearch = searchTerm == null ? "" : searchTerm.trim();
        return userRepository.searchUsers(role, status, normalizedSearch, pageable)
            .map(this::toUserResponse);
    }

    @Transactional(readOnly = true)
    public List<UserResponse> getPendingDoctors() {
        return userRepository.findPendingDoctors().stream()
                .map(this::toUserResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public UserResponse updateUserStatus(String userId, UserApprovalRequest request, String adminId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException(userId));

        applyAdminAction(user, request.getAction());
        stampApprovalAudit(user, adminId, request.getNotes());
        User saved = userRepository.save(user);
        publishStatusChangedEvent(saved, request.getAction().name(), adminId, request.getNotes());

        log.info(
            "Admin {} applied action {} to user {} (role={}, status={})",
            adminId,
            request.getAction(),
            userId,
            saved.getRole(),
            saved.getAccountStatus()
        );
        return toUserResponse(saved);
    }

    @Transactional(readOnly = true)
    public UserResponse getUserById(String userId) {
        return userRepository.findById(userId)
                .map(this::toUserResponse)
                .orElseThrow(() -> new UserNotFoundException(userId));
    }

    @Transactional(readOnly = true)
    public List<UserResponse> getUsersByRole(User.Role role) {
        return userRepository.findByRole(role).stream()
                .map(this::toUserResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<UserResponse> getUsersByStatus(User.AccountStatus status) {
        return userRepository.findByAccountStatus(status).stream()
                .map(this::toUserResponse)
                .collect(Collectors.toList());
    }

    /**
     * Soft-suspend a user account. The record is preserved for audit purposes.
     */
    @Transactional
    public void suspendUser(String userId, String adminId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException(userId));

        user.setAccountStatus(User.AccountStatus.SUSPENDED);
        stampApprovalAudit(user, adminId, "Account suspended by admin");

        log.info("Admin {} suspended user {}", adminId, userId);
        User saved = userRepository.save(user);
        publishStatusChangedEvent(saved, UserApprovalRequest.ApprovalAction.SUSPEND.name(), adminId,
            "Account suspended by admin");
    }

    @Transactional(readOnly = true)
    public PlatformStatistics getPlatformStatistics() {
        PlatformStatistics stats = new PlatformStatistics();

        Map<String, Object> userStatsData = userRepository.getPlatformStatistics();
        stats.setUserStats(new PlatformStatistics.UserStatistics(userStatsData));

        LocalDateTime thirtyDaysAgo = LocalDateTime.now().minusDays(30);
        List<PlatformStatistics.RegistrationStatistic> regStats = userRepository
                .getRegistrationStatistics(thirtyDaysAgo).stream()
                .map(PlatformStatistics.RegistrationStatistic::new)
                .collect(Collectors.toList());
        stats.setRegistrationTrends(regStats);

        PlatformStatistics.SystemHealth systemHealth = new PlatformStatistics.SystemHealth();
        systemHealth.setStatus("UP");
        systemHealth.setDatabaseStatus("UP");
        systemHealth.setMessagingStatus("UP");
        systemHealth.setUptime(System.currentTimeMillis());
        stats.setSystemHealth(systemHealth);

        return stats;
    }

    @Transactional(readOnly = true)
    public List<UserResponse> getUsersRegisteredBetween(LocalDateTime startDate, LocalDateTime endDate) {
        return userRepository.findUsersRegisteredBetween(startDate, endDate).stream()
                .map(this::toUserResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Map<String, Long> getCountStatistics() {
        return Map.of(
                "totalUsers", userRepository.count(),
                "totalPatients", userRepository.countByRole(User.Role.PATIENT),
                "totalDoctors", userRepository.countByRole(User.Role.DOCTOR),
                "totalAdmins", userRepository.countByRole(User.Role.ADMIN),
                "pendingDoctors", userRepository.countByRoleAndAccountStatus(User.Role.DOCTOR, User.AccountStatus.PENDING),
                "approvedDoctors", userRepository.countByRoleAndAccountStatus(User.Role.DOCTOR, User.AccountStatus.APPROVED),
                "rejectedDoctors", userRepository.countByRoleAndAccountStatus(User.Role.DOCTOR, User.AccountStatus.REJECTED),
                "suspendedUsers", userRepository.countByAccountStatus(User.AccountStatus.SUSPENDED)
        );
    }

    @Transactional
    public List<UserResponse> bulkUpdateUsers(List<String> userIds, UserApprovalRequest request, String adminId) {
        List<User> users = userRepository.findAllById(userIds);
        for (User user : users) {
            applyAdminAction(user, request.getAction());
            stampApprovalAudit(user, adminId, request.getNotes());
        }
        List<User> savedUsers = userRepository.saveAll(users);
        savedUsers.forEach(user -> publishStatusChangedEvent(user, request.getAction().name(), adminId, request.getNotes()));
        log.info("Admin {} bulk-updated {} users with action {}", adminId, users.size(), request.getAction());
        return savedUsers.stream()
            .map(this::toUserResponse)
                .collect(Collectors.toList());
    }

    //  private helpers 

    private void applyAdminAction(User user, UserApprovalRequest.ApprovalAction action) {
        if (action == UserApprovalRequest.ApprovalAction.PROMOTE_TO_ADMIN) {
            promoteToAdmin(user);
            return;
        }

        User.AccountStatus newStatus = switch (action) {
            case APPROVE, REACTIVATE -> User.AccountStatus.APPROVED;
            case REJECT -> User.AccountStatus.REJECTED;
            case SUSPEND -> User.AccountStatus.SUSPENDED;
            case PROMOTE_TO_ADMIN -> User.AccountStatus.APPROVED;
        };
        user.setAccountStatus(newStatus);
    }

    private void promoteToAdmin(User user) {
        if (user.getRole() == User.Role.ADMIN) {
            throw new CurexUserException("User is already an admin", HttpStatus.BAD_REQUEST);
        }

        user.setRole(User.Role.ADMIN);
        user.setAccountStatus(User.AccountStatus.APPROVED);
    }

    private void stampApprovalAudit(User user, String adminId, String notes) {
        user.setApprovedBy(adminId);
        user.setApprovalNotes(notes);
        user.setApprovalDate(LocalDateTime.now());
    }

    private UserResponse toUserResponse(User user) {
        UserResponse response = new UserResponse(user);
        response.setApprovedBy(resolveApprovedByDisplayName(response.getApprovedBy()));
        return profileBridgeService.enrich(response);
    }

    private String resolveApprovedByDisplayName(String approvedBy) {
        if (approvedBy == null || approvedBy.isBlank()) {
            return approvedBy;
        }
        if ("system".equalsIgnoreCase(approvedBy)) {
            return "System";
        }

        return userRepository.findById(approvedBy)
                .map(approver -> approver.getFirstName() + " " + approver.getLastName())
                .map(String::trim)
                .filter(name -> !name.isBlank())
                .orElse(approvedBy);
    }

    private void publishStatusChangedEvent(User user, String action, String adminId, String notes) {
        try {
            Map<String, Object> event = new HashMap<>();
            event.put("userId", user.getId());
            event.put("email", user.getEmail());
            event.put("firstName", user.getFirstName());
            event.put("lastName", user.getLastName());
            event.put("role", user.getRole().name());
            event.put("status", user.getAccountStatus().name());
            event.put("action", action);
            event.put("adminId", adminId == null ? "system" : adminId);
            event.put("notes", notes == null ? "" : notes);

            rabbitTemplate.convertAndSend(
                    RabbitMQConfig.USER_EXCHANGE,
                    "user.status.changed",
                    event
            );
        } catch (Exception e) {
            log.warn("Failed to publish status-change event for user {}: {}", user.getId(), e.getMessage());
        }
    }
}
