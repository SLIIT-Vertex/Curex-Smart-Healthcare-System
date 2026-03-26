package com.curex.user.service;

import com.curex.user.dto.UserResponse;
import com.curex.user.entity.User;
import com.curex.user.exception.UserNotFoundException;
import com.curex.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Read-only user query service for non-admin callers.
 *
 * Rules enforced here:
 *  - Public-facing methods only return APPROVED users.
 *  - Internal methods (used by other microservices via the private network) return any status.
 *  - No mutation happens in this service.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserQueryService {

    private final UserRepository userRepository;

    // ── Own profile ──────────────────────────────────────────────────────────

    /** Returns the caller's own profile regardless of account status. */
    public UserResponse getOwnProfile(String email) {
        return userRepository.findByEmail(email)
                .map(UserResponse::new)
                .orElseThrow(() -> new UserNotFoundException(email));
    }

    // ── Approved-user lookups (for any authenticated user) ───────────────────

    /** Get one approved user by their ID. Returns 404 if not found or not approved. */
    public UserResponse getApprovedUserById(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException(userId));
        if (user.getAccountStatus() != User.AccountStatus.APPROVED) {
            throw new UserNotFoundException(userId);
        }
        return new UserResponse(user);
    }

    /** Paginated search across APPROVED users. Filters by name (first/last/email) and/or role. */
    public Page<UserResponse> searchApprovedUsers(String name, User.Role role, int page, int size) {
        String normalizedName = name == null ? "" : name.trim();
        return userRepository.searchUsers(role, User.AccountStatus.APPROVED, normalizedName, PageRequest.of(page, size))
                .map(UserResponse::new);
    }

    /** All approved users of a given role. */
    public List<UserResponse> getApprovedUsersByRole(User.Role role) {
        return userRepository.findByRoleAndAccountStatus(role, User.AccountStatus.APPROVED)
                .stream()
                .map(UserResponse::new)
                .collect(Collectors.toList());
    }

    /** Convenience shortcut — all approved doctors. */
    public List<UserResponse> getApprovedDoctors() {
        return getApprovedUsersByRole(User.Role.DOCTOR);
    }

    /** Convenience shortcut — all approved patients. */
    public List<UserResponse> getApprovedPatients() {
        return getApprovedUsersByRole(User.Role.PATIENT);
    }

    // ── Internal / service-to-service lookups (no status filter) ────────────
    // These are called via the internal Docker network only — no gateway exposure.

    /** Get any user by ID regardless of account status (for service-to-service calls). */
    public UserResponse getAnyUserById(String userId) {
        return userRepository.findById(userId)
                .map(UserResponse::new)
                .orElseThrow(() -> new UserNotFoundException(userId));
    }

    /** Get any user by email regardless of account status (for service-to-service calls). */
    public UserResponse getAnyUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .map(UserResponse::new)
                .orElseThrow(() -> new UserNotFoundException(email));
    }

    /** Get all users of a role regardless of status (for service-to-service calls). */
    public List<UserResponse> getAllUsersByRole(User.Role role) {
        return userRepository.findByRole(role).stream()
                .map(UserResponse::new)
                .collect(Collectors.toList());
    }
}
