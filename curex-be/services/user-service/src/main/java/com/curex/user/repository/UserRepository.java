package com.curex.user.repository;

import com.curex.user.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, String> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    List<User> findByRole(User.Role role);

    List<User> findByAccountStatus(User.AccountStatus accountStatus);

    List<User> findByRoleAndAccountStatus(User.Role role, User.AccountStatus accountStatus);

    @Query("SELECT u FROM User u WHERE u.role = 'DOCTOR' AND u.accountStatus = 'PENDING' ORDER BY u.createdAt ASC")
    List<User> findPendingDoctors();

    Page<User> findByRoleOrderByCreatedAtDesc(User.Role role, Pageable pageable);

    Page<User> findAllByOrderByCreatedAtDesc(Pageable pageable);

    long countByRole(User.Role role);

    long countByAccountStatus(User.AccountStatus status);

    long countByRoleAndAccountStatus(User.Role role, User.AccountStatus status);

    @Query("SELECT u FROM User u WHERE " +
           "(:role IS NULL OR u.role = :role) AND " +
           "(:status IS NULL OR u.accountStatus = :status) AND " +
           "(:searchTerm IS NULL OR " +
           "LOWER(u.firstName) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
           "LOWER(u.lastName) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
           "LOWER(u.email) LIKE LOWER(CONCAT('%', :searchTerm, '%'))) " +
           "ORDER BY u.createdAt DESC")
    Page<User> searchUsers(
        @Param("role") User.Role role,
        @Param("status") User.AccountStatus status,
        @Param("searchTerm") String searchTerm,
        Pageable pageable
    );

    @Query("SELECT u FROM User u WHERE u.createdAt BETWEEN :startDate AND :endDate ORDER BY u.createdAt DESC")
    List<User> findUsersRegisteredBetween(
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate") LocalDateTime endDate
    );

    /** Fixed: single native query replacing the duplicate-@Query bug in admin-service */
    @Query(value = "SELECT " +
           "COUNT(CASE WHEN role = 'PATIENT' THEN 1 END) as total_patients, " +
           "COUNT(CASE WHEN role = 'DOCTOR' THEN 1 END) as total_doctors, " +
           "COUNT(CASE WHEN role = 'ADMIN' THEN 1 END) as total_admins, " +
           "COUNT(CASE WHEN role = 'DOCTOR' AND account_status = 'PENDING' THEN 1 END) as pending_doctors, " +
           "COUNT(CASE WHEN role = 'DOCTOR' AND account_status = 'APPROVED' THEN 1 END) as approved_doctors, " +
           "COUNT(CASE WHEN role = 'DOCTOR' AND account_status = 'REJECTED' THEN 1 END) as rejected_doctors " +
           "FROM users", nativeQuery = true)
    Map<String, Object> getPlatformStatistics();

    @Query(value = "SELECT " +
           "DATE(created_at) as date, " +
           "COUNT(*) as registrations " +
           "FROM users " +
           "WHERE created_at >= :startDate " +
           "GROUP BY DATE(created_at) " +
           "ORDER BY DATE(created_at) DESC", nativeQuery = true)
    List<Map<String, Object>> getRegistrationStatistics(@Param("startDate") LocalDateTime startDate);
}
