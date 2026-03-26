package com.curex.user.service;

import com.curex.user.dto.AuthResponse;
import com.curex.user.dto.ChangePasswordRequest;
import com.curex.user.dto.LoginRequest;
import com.curex.user.dto.RegisterRequest;
import com.curex.user.entity.User;
import com.curex.user.exception.AccountNotActiveException;
import com.curex.user.exception.AdminRegistrationForbiddenException;
import com.curex.user.exception.EmailAlreadyExistsException;
import com.curex.user.exception.InvalidCredentialsException;
import com.curex.user.exception.InvalidPasswordChangeException;
import com.curex.user.exception.PhoneVerificationRequiredException;
import com.curex.user.exception.UserNotFoundException;
import com.curex.user.repository.UserRepository;
import com.curex.user.security.JwtTokenUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Consumer;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenUtil jwtTokenUtil;
    private final AuthenticationManager authenticationManager;
    private final UserDetailsService userDetailsService;
    private final RabbitTemplate rabbitTemplate;
    private final OtpService otpService;

    public AuthResponse register(RegisterRequest request) {
        // ADMIN accounts must be seeded via database or created by an existing admin.
        // Self-registration as ADMIN is forbidden to prevent privilege escalation.
        if (request.getRole() == User.Role.ADMIN) {
            throw new AdminRegistrationForbiddenException();
        }

        // Enforce phone verification before account creation.
        if (!otpService.isPhoneVerified(request.getPhoneNumber(), request.getPhoneVerificationToken())) {
            throw new PhoneVerificationRequiredException();
        }

        // Enforce email verification before account creation.
        if (!otpService.isEmailVerified(request.getEmail(), request.getEmailVerificationToken())) {
            throw new PhoneVerificationRequiredException();
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new EmailAlreadyExistsException(request.getEmail());
        }

        User user = new User();
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user.setPhoneNumber(request.getPhoneNumber());
        user.setRole(request.getRole());
        user.setAccountStatus(request.getRole() == User.Role.DOCTOR
                ? User.AccountStatus.PENDING
                : User.AccountStatus.APPROVED);
        user.setEmailVerified(true);

        applyProfileFields(user, request);

        User savedUser = userRepository.save(user);
        log.info("User registered: {} role={}", savedUser.getEmail(), savedUser.getRole());

        // Invalidate the verification tokens so they cannot be reused.
        otpService.consumePhoneVerificationToken(request.getPhoneVerificationToken());
        otpService.consumeEmailVerificationToken(request.getEmailVerificationToken());

        publishRegistrationEvent(savedUser);

        // Doctors require admin approval before they can log in — do not issue tokens.
        if (request.getRole() == User.Role.DOCTOR) {
            return new AuthResponse(null, null, null, new AuthResponse.UserInfo(savedUser));
        }

        UserDetails userDetails = userDetailsService.loadUserByUsername(savedUser.getEmail());
        String accessToken  = jwtTokenUtil.generateToken(userDetails);
        String refreshToken = jwtTokenUtil.generateRefreshToken(userDetails);

        return new AuthResponse(accessToken, refreshToken, jwtTokenUtil.getExpirationTime(),
                new AuthResponse.UserInfo(savedUser));
    }

    public AuthResponse login(LoginRequest request) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword()));

            UserDetails userDetails = (UserDetails) authentication.getPrincipal();
            User user = userRepository.findByEmail(request.getEmail())
                    .orElseThrow(() -> new UserNotFoundException(request.getEmail()));

            if (user.getRole() == User.Role.DOCTOR
                    && user.getAccountStatus() != User.AccountStatus.APPROVED) {
                throw new AccountNotActiveException("Doctor account is pending admin approval");
            }

            if (user.getAccountStatus() == User.AccountStatus.REJECTED
                    || user.getAccountStatus() == User.AccountStatus.SUSPENDED) {
                throw new AccountNotActiveException(
                        "Account is " + user.getAccountStatus().name().toLowerCase());
            }

            log.info("User logged in: {}", user.getEmail());

            String accessToken  = jwtTokenUtil.generateToken(userDetails);
            String refreshToken = jwtTokenUtil.generateRefreshToken(userDetails);

            return new AuthResponse(accessToken, refreshToken, jwtTokenUtil.getExpirationTime(),
                    new AuthResponse.UserInfo(user));

        } catch (BadCredentialsException e) {
            throw new InvalidCredentialsException();
        }
    }

    public AuthResponse refreshToken(String refreshToken) {
        if (!jwtTokenUtil.validateToken(refreshToken)) {
            throw new InvalidCredentialsException();
        }

        String email        = jwtTokenUtil.extractEmail(refreshToken);
        UserDetails userDetails = userDetailsService.loadUserByUsername(email);
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UserNotFoundException(email));

        String newAccessToken = jwtTokenUtil.generateToken(userDetails);

        return new AuthResponse(newAccessToken, refreshToken, jwtTokenUtil.getExpirationTime(),
                new AuthResponse.UserInfo(user));
    }

    public void changePassword(String email, ChangePasswordRequest request) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UserNotFoundException(email));

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new InvalidPasswordChangeException("Current password is incorrect");
        }

        if (request.getCurrentPassword().equals(request.getNewPassword())) {
            throw new InvalidPasswordChangeException("New password must be different from current password");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
        log.info("Password changed for user: {}", user.getEmail());

        publishPasswordChangedEvent(user);
    }

    public boolean validateToken(String token) {
        return jwtTokenUtil.validateToken(token);
    }

    /**
     * Returns {@code true} when an account with the given email already exists.
     * Used by the OTP send endpoint to fail fast before dispatching verification codes.
     */
    @Transactional(readOnly = true)
    public boolean emailExists(String email) {
        return userRepository.existsByEmail(email) || userRepository.isUserRejected(email) ;
    }

    @Transactional(readOnly = true)
    public User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new UserNotFoundException(email));
    }

    @Transactional(readOnly = true)
    public User getUserById(String userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException(userId));
    }

    /**
     * Copies optional profile fields from the registration payload onto the new user entity.
     * Role-specific fields are naturally skipped because the frontend sends them as null
     * for the wrong role — no explicit role guard needed.
     */
    private void applyProfileFields(User user, RegisterRequest r) {
        // Common
        set(r.getProfileImageUrl(), user::setProfileImageUrl);
        set(r.getDob(),             user::setDob);
        set(r.getGender(),          user::setGender);
        set(r.getAddress(),         user::setAddress);
        // Doctor-specific
        set(r.getSpecialty(),            user::setSpecialty);
        set(r.getMedicalLicenseNumber(), user::setMedicalLicenseNumber);
        set(r.getYearsOfExperience(),    user::setYearsOfExperience);
        set(r.getCertifications(),       user::setCertifications);
        set(r.getProofDocumentUrls(),    user::setProofDocumentUrls);
        // Patient-specific
        set(r.getBloodGroup(),            user::setBloodGroup);
        set(r.getAllergies(),              user::setAllergies);
        set(r.getChronicConditions(),     user::setChronicConditions);
        set(r.getEmergencyContactName(),  user::setEmergencyContactName);
        set(r.getEmergencyContactPhone(), user::setEmergencyContactPhone);
    }

    private static <T> void set(T value, Consumer<T> setter) {
        if (value != null) setter.accept(value);
    }

    private void publishRegistrationEvent(User user) {
        try {
            Map<String, Object> event = new HashMap<>();
            event.put("userId",      user.getId());
            event.put("email",       user.getEmail());
            event.put("firstName",   user.getFirstName());
            event.put("lastName",    user.getLastName());
            event.put("role",        user.getRole().name());
            event.put("phoneNumber", user.getPhoneNumber());

            rabbitTemplate.convertAndSend("user.exchange", "user.registration", event);
            log.debug("Published registration event for user: {}", user.getEmail());
        } catch (Exception e) {
            log.warn("Failed to publish registration event for {}: {}", user.getEmail(), e.getMessage());
        }
    }

    private void publishPasswordChangedEvent(User user) {
        try {
            Map<String, Object> event = new HashMap<>();
            event.put("userId", user.getId());
            event.put("email", user.getEmail());
            event.put("firstName", user.getFirstName());
            event.put("changedAt", LocalDateTime.now().toString());

            rabbitTemplate.convertAndSend("user.exchange", "user.password.changed", event);
            log.debug("Published password-changed event for user: {}", user.getEmail());
        } catch (Exception e) {
            log.warn("Failed to publish password-changed event for {}: {}", user.getEmail(), e.getMessage());
        }
    }
}
