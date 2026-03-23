package com.curex.user.config;

import com.curex.user.entity.User;
import com.curex.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Seeds essential data on first startup.
 *
 * Runs after Spring context is fully initialised (ApplicationRunner).
 * Idempotent — skipped if seed data already exists.
 *
 * Default admin credentials (change immediately after first login):
 *   Email    : admin@curex.com
 *   Password : Admin@Curex2024
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DataSeeder implements ApplicationRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        seedSuperAdmin();
    }

    private void seedSuperAdmin() {
        if (userRepository.existsByEmail("admin@curex.com")) {
            log.info("Seed skipped — admin@curex.com already exists");
            return;
        }

        User admin = new User();
        admin.setEmail("admin@curex.com");
        admin.setPassword(passwordEncoder.encode("Admin@Curex2024"));
        admin.setFirstName("Super");
        admin.setLastName("Admin");
        admin.setPhoneNumber("+94700000000");
        admin.setRole(User.Role.ADMIN);
        admin.setAccountStatus(User.AccountStatus.APPROVED);
        admin.setEmailVerified(true);
        admin.setApprovedBy("system");
        admin.setApprovalNotes("System-seeded super admin");
        admin.setApprovalDate(LocalDateTime.now());

        userRepository.save(admin);

        log.warn("=============================================================");
        log.warn("  SEED ADMIN CREATED — CHANGE PASSWORD IMMEDIATELY");
        log.warn("  Email   : admin@curex.com");
        log.warn("  Password: Admin@Curex2024");
        log.warn("=============================================================");
    }
}
