package com.curex.user.service;

import com.curex.user.dto.UpdateProfileRequest;
import com.curex.user.dto.UserResponse;
import com.curex.user.entity.User;
import com.curex.user.exception.UserNotFoundException;
import com.curex.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

        // Doctor-specific
        if (request.getSpecialty() != null)            user.setSpecialty(request.getSpecialty());
        if (request.getMedicalLicenseNumber() != null) user.setMedicalLicenseNumber(request.getMedicalLicenseNumber());
        if (request.getYearsOfExperience() != null)    user.setYearsOfExperience(request.getYearsOfExperience());
        if (request.getCertifications() != null)       user.setCertifications(request.getCertifications());
        if (request.getProofDocumentUrls() != null)    user.setProofDocumentUrls(request.getProofDocumentUrls());

        // Patient-specific
        if (request.getBloodGroup() != null)           user.setBloodGroup(request.getBloodGroup());
        if (request.getAllergies() != null)             user.setAllergies(request.getAllergies());
        if (request.getChronicConditions() != null)    user.setChronicConditions(request.getChronicConditions());
        if (request.getEmergencyContactName() != null) user.setEmergencyContactName(request.getEmergencyContactName());
        if (request.getEmergencyContactPhone() != null) user.setEmergencyContactPhone(request.getEmergencyContactPhone());

        User saved = userRepository.save(user);
        log.info("Profile updated for user: {}", saved.getEmail());

        return new UserResponse(saved);
    }
}
