package com.curex.user.service;

import com.curex.user.dto.AuthResponse;
import com.curex.user.dto.LoginRequest;
import com.curex.user.dto.RegisterRequest;
import com.curex.user.entity.User;
import com.curex.user.exception.AccountNotActiveException;
import com.curex.user.exception.AdminRegistrationForbiddenException;
import com.curex.user.exception.EmailAlreadyExistsException;
import com.curex.user.exception.InvalidCredentialsException;
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

import java.util.HashMap;
import java.util.Map;

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

    public AuthResponse register(RegisterRequest request) {
        // ADMIN accounts must be seeded via database or created by an existing admin.
        // Self-registration as ADMIN is forbidden to prevent privilege escalation.
        if (request.getRole() == User.Role.ADMIN) {
            throw new AdminRegistrationForbiddenException();
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
        user.setEmailVerified(false);

        User savedUser = userRepository.save(user);
        log.info("User registered: {} role={}", savedUser.getEmail(), savedUser.getRole());

        publishRegistrationEvent(savedUser);

        UserDetails userDetails = userDetailsService.loadUserByUsername(savedUser.getEmail());
        String accessToken = jwtTokenUtil.generateToken(userDetails);
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

            String accessToken = jwtTokenUtil.generateToken(userDetails);
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

        String email = jwtTokenUtil.extractEmail(refreshToken);
        UserDetails userDetails = userDetailsService.loadUserByUsername(email);
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UserNotFoundException(email));

        String newAccessToken = jwtTokenUtil.generateToken(userDetails);

        return new AuthResponse(newAccessToken, refreshToken, jwtTokenUtil.getExpirationTime(),
                new AuthResponse.UserInfo(user));
    }

    public boolean validateToken(String token) {
        return jwtTokenUtil.validateToken(token);
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

    private void publishRegistrationEvent(User user) {
        try {
            Map<String, Object> event = new HashMap<>();
            event.put("userId", user.getId());
            event.put("email", user.getEmail());
            event.put("firstName", user.getFirstName());
            event.put("lastName", user.getLastName());
            event.put("role", user.getRole().name());
            event.put("phoneNumber", user.getPhoneNumber());

            rabbitTemplate.convertAndSend("user.exchange", "user.registration", event);
            log.debug("Published registration event for user: {}", user.getEmail());
        } catch (Exception e) {
            log.warn("Failed to publish registration event for {}: {}", user.getEmail(), e.getMessage());
        }
    }
}
