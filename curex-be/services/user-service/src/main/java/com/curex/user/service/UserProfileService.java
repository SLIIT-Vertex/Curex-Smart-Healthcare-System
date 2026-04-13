package com.curex.user.service;

import com.curex.user.dto.NotificationPreferencesRequest;
import com.curex.user.dto.NotificationPreferencesResponse;
import com.curex.user.dto.UpdateProfileRequest;
import com.curex.user.dto.UserResponse;
import com.curex.user.entity.User;
import com.curex.user.exception.UserNotFoundException;
import com.curex.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

/**
 * Handles mutable profile operations for authenticated users.
 *
 * Separated from {@link UserQueryService} (which is read-only) to respect
 * the command-query separation principle and keep transactional boundaries clear.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class UserProfileService {

    private final UserRepository userRepository;
    private final UserDataDeletionOrchestrator userDataDeletionOrchestrator;
    private final ProfileBridgeService profileBridgeService;

    /**
     * Updates the profile of the currently authenticated user.
     *
     * Only non-null fields in the request are applied — null means "no change".
     * This allows the frontend to send only the fields that were collected without
     * blanking out existing values for fields that were not shown in the form.
     *
     * @param email   email of the authenticated caller (from JWT principal)
     * @param request profile data to apply (all fields optional)
     * @return the updated user response
     */
    public UserResponse updateProfile(String email, UpdateProfileRequest request) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UserNotFoundException(email));

        // Basic identity fields
        if (request.getFirstName() != null)      user.setFirstName(request.getFirstName());
        if (request.getLastName() != null)       user.setLastName(request.getLastName());
        if (request.getPhoneNumber() != null)    user.setPhoneNumber(request.getPhoneNumber());
        if (request.getProfileImageUrl() != null) user.setProfileImageUrl(request.getProfileImageUrl());

        // Common profile fields
        if (request.getDob() != null)     user.setDob(request.getDob());
        if (request.getGender() != null)  user.setGender(request.getGender());
        if (request.getAddress() != null) user.setAddress(request.getAddress());
        if (request.getBio() != null)     user.setBio(request.getBio());

        User saved = userRepository.save(user);
        profileBridgeService.syncAfterProfileUpdate(saved, request);
        log.info("Profile updated for user: {}", saved.getEmail());

        return profileBridgeService.enrich(new UserResponse(saved));
    }

    @Transactional(readOnly = true)
    public NotificationPreferencesResponse getNotificationPreferencesByEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UserNotFoundException(email));
        return new NotificationPreferencesResponse(user);
    }

    @Transactional(readOnly = true)
    public NotificationPreferencesResponse getNotificationPreferencesByUserId(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException(userId));
        return new NotificationPreferencesResponse(user);
    }

    public NotificationPreferencesResponse updateNotificationPreferences(
            String email,
            NotificationPreferencesRequest request
    ) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UserNotFoundException(email));

        if (request.getAppointmentReminders() != null) {
            user.setNotifyAppointmentReminders(request.getAppointmentReminders());
        }
        if (request.getPrescriptionAlerts() != null) {
            user.setNotifyPrescriptionAlerts(request.getPrescriptionAlerts());
        }
        if (request.getPaymentAlerts() != null) {
            user.setNotifyPaymentAlerts(request.getPaymentAlerts());
        }
        if (request.getEmailDigest() != null) {
            user.setNotifyEmailDigest(request.getEmailDigest());
        }

        User saved = userRepository.save(user);
        return new NotificationPreferencesResponse(saved);
    }

    public void deleteOwnAccount(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UserNotFoundException(email));

        userDataDeletionOrchestrator.purgeUserDataAcrossServices(user.getId());
        userRepository.delete(user);
        log.info("Deleted user account {} ({})", user.getId(), user.getEmail());
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getDoctorProfileByUserId(String userId) {
        return profileBridgeService.getDoctorProfileByUserId(userId);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getPatientProfileByUserId(String userId) {
        return profileBridgeService.getPatientProfileByUserId(userId);
    }

    public Map<String, Object> bootstrapOwnRoleProfile(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UserNotFoundException(email));
        return profileBridgeService.bootstrapRoleProfile(user);
    }
}
