package com.curex.user.service;

import com.curex.user.dto.PlatformStatistics;
import com.curex.user.dto.UserApprovalRequest;
import com.curex.user.dto.UserResponse;
import com.curex.user.entity.User;
import com.curex.user.exception.UserNotFoundException;
import com.curex.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public Page<UserResponse> getAllUsers(int page, int size, User.Role role,
                                         User.AccountStatus status, String searchTerm) {
        Pageable pageable = PageRequest.of(page, size);
        String normalizedSearch = searchTerm == null ? "" : searchTerm.trim();
        return userRepository.searchUsers(role, status, normalizedSearch, pageable)
                .map(UserResponse::new);
    }

    @Transactional(readOnly = true)
    public List<UserResponse> getPendingDoctors() {
        return userRepository.findPendingDoctors().stream()
                .map(UserResponse::new)
                .collect(Collectors.toList());
    }

    @Transactional
    public UserResponse updateUserStatus(String userId, UserApprovalRequest request, String adminId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException(userId));

        applyStatusAction(user, request.getAction());
        stampApprovalAudit(user, adminId, request.getNotes());

        log.info("Admin {} changed user {} status to {}", adminId, userId, user.getAccountStatus());
        return new UserResponse(userRepository.save(user));
    }

    @Transactional(readOnly = true)
    public UserResponse getUserById(String userId) {
        return userRepository.findById(userId)
                .map(UserResponse::new)
                .orElseThrow(() -> new UserNotFoundException(userId));
    }

    @Transactional(readOnly = true)
    public List<UserResponse> getUsersByRole(User.Role role) {
        return userRepository.findByRole(role).stream()
                .map(UserResponse::new)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<UserResponse> getUsersByStatus(User.AccountStatus status) {
        return userRepository.findByAccountStatus(status).stream()
                .map(UserResponse::new)
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
        userRepository.save(user);
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
                .map(UserResponse::new)
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
            applyStatusAction(user, request.getAction());
            stampApprovalAudit(user, adminId, request.getNotes());
        }
        log.info("Admin {} bulk-updated {} users with action {}", adminId, users.size(), request.getAction());
        return userRepository.saveAll(users).stream()
                .map(UserResponse::new)
                .collect(Collectors.toList());
    }

    //  private helpers 

    private void applyStatusAction(User user, UserApprovalRequest.ApprovalAction action) {
        User.AccountStatus newStatus = switch (action) {
            case APPROVE, REACTIVATE -> User.AccountStatus.APPROVED;
            case REJECT -> User.AccountStatus.REJECTED;
            case SUSPEND -> User.AccountStatus.SUSPENDED;
        };
        user.setAccountStatus(newStatus);
    }

    private void stampApprovalAudit(User user, String adminId, String notes) {
        user.setApprovedBy(adminId);
        user.setApprovalNotes(notes);
        user.setApprovalDate(LocalDateTime.now());
    }
}
