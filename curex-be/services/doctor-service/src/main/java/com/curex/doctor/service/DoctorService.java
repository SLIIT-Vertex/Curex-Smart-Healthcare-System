package com.curex.doctor.service;

import com.curex.doctor.dto.AvailabilitySlotResponse;
import com.curex.doctor.dto.BookableDoctorResponse;
import com.curex.doctor.dto.CreateAvailabilityBulkRequest;
import com.curex.doctor.dto.CreateDoctorRequest;
import com.curex.doctor.dto.DoctorResponse;
import com.curex.doctor.dto.UpdateDoctorRequest;
import com.curex.doctor.entity.Doctor;
import com.curex.doctor.entity.DoctorAvailability;
import com.curex.doctor.exception.DoctorAlreadyExistsException;
import com.curex.doctor.exception.ResourceNotFoundException;
import com.curex.doctor.exception.SlotNotFoundException;
import com.curex.doctor.feign.UserServiceClient;
import com.curex.doctor.feign.dto.ApprovedUserFeignDto;
import com.curex.doctor.repository.DoctorAvailabilityRepository;
import com.curex.doctor.repository.DoctorRepository;
import com.curex.doctor.repository.PrescriptionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DoctorService {

    private final DoctorRepository doctorRepository;
    private final DoctorAvailabilityRepository availabilityRepository;
    private final PrescriptionRepository prescriptionRepository;
    private final UserServiceClient userServiceClient;

    @Transactional
    public DoctorResponse create(CreateDoctorRequest request) {
        if (doctorRepository.existsByUserId(request.getUserId())) {
            throw new DoctorAlreadyExistsException("Doctor profile already exists for user: " + request.getUserId());
        }
        if (doctorRepository.existsByEmail(request.getEmail())) {
            throw new DoctorAlreadyExistsException("A doctor with email " + request.getEmail() + " already exists");
        }

        Doctor doctor = Doctor.builder()
                .userId(request.getUserId())
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .email(request.getEmail())
                .phone(request.getPhone())
                .specialization(request.getSpecialization())
                .qualifications(request.getQualifications())
                .experience(request.getExperience() != null ? request.getExperience() : 0)
                .consultationFee(request.getConsultationFee())
                .bio(request.getBio())
                .isVerified(false)
                .build();

        doctor = doctorRepository.save(doctor);
        log.info("Created doctor profile for user {}", request.getUserId());
        return toDoctorResponse(doctor);
    }

    @Transactional(readOnly = true)
    public DoctorResponse getById(String id) {
        Doctor doctor = doctorRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor not found with id: " + id));
        return toDoctorResponse(doctor);
    }

    @Transactional(readOnly = true)
    public DoctorResponse getByUserId(String userId) {
        Doctor doctor = doctorRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor not found for user id: " + userId));
        return toDoctorResponse(doctor);
    }

    @Transactional
    public DoctorResponse update(String id, UpdateDoctorRequest request) {
        Doctor doctor = doctorRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor not found with id: " + id));

        if (request.getPhone() != null) doctor.setPhone(request.getPhone());
        if (request.getSpecialization() != null) doctor.setSpecialization(request.getSpecialization());
        if (request.getQualifications() != null) doctor.setQualifications(request.getQualifications());
        if (request.getExperience() != null) doctor.setExperience(request.getExperience());
        if (request.getConsultationFee() != null) doctor.setConsultationFee(request.getConsultationFee());
        if (request.getBio() != null) doctor.setBio(request.getBio());

        doctor = doctorRepository.save(doctor);
        log.info("Updated doctor profile {}", id);
        return toDoctorResponse(doctor);
    }

    /**
     * Doctors who have a profile here and whose user account is {@code APPROVED} in user-service.
     */
    @Transactional(readOnly = true)
    public List<BookableDoctorResponse> listApprovedForBooking() {
        List<ApprovedUserFeignDto> approved;
        try {
            approved = userServiceClient.getApprovedUsersByRole("DOCTOR");
        } catch (Exception e) {
            log.error("Failed to fetch approved doctors from user-service: {}", e.getMessage());
            return Collections.emptyList();
        }
        if (approved == null || approved.isEmpty()) {
            return Collections.emptyList();
        }
        Set<String> userIds = approved.stream()
                .map(ApprovedUserFeignDto::getId)
                .collect(Collectors.toSet());
        return doctorRepository.findByUserIdIn(userIds).stream()
                .map(doctor -> toBookableDoctorResponse(doctor))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<DoctorResponse> searchBySpecialty(String specialty) {
        if (specialty == null || specialty.isBlank()) {
            return doctorRepository.findAll().stream()
                    .map(this::toDoctorResponse)
                    .collect(Collectors.toList());
        }
        return doctorRepository.findBySpecializationContainingIgnoreCase(specialty).stream()
                .map(this::toDoctorResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public List<AvailabilitySlotResponse> addAvailability(String doctorId, CreateAvailabilityBulkRequest request) {
        Doctor doctor = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor not found with id: " + doctorId));

        List<DoctorAvailability> saved = request.getSlots().stream()
                .map(req -> DoctorAvailability.builder()
                        .doctor(doctor)
                        .day(req.getDay())
                        .startTime(req.getStartTime())
                        .endTime(req.getEndTime())
                        .isBooked(false)
                        .build())
                .map(availabilityRepository::save)
                .collect(Collectors.toList());

        log.info("Added {} availability slot(s) for doctor {}", saved.size(), doctorId);
        return availabilityRepository.findByDoctor_IdOrderByDayAscStartTimeAsc(doctorId).stream()
                .map(this::toAvailabilitySlotResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<AvailabilitySlotResponse> getAvailability(String doctorId) {
        if (!doctorRepository.existsById(doctorId)) {
            throw new ResourceNotFoundException("Doctor not found with id: " + doctorId);
        }
        return availabilityRepository.findByDoctor_IdOrderByDayAscStartTimeAsc(doctorId).stream()
                .map(this::toAvailabilitySlotResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public void markSlotBooked(String doctorId, String slotId) {
        DoctorAvailability slot = availabilityRepository.findById(slotId)
                .orElseThrow(() -> new SlotNotFoundException("Availability slot not found: " + slotId));

        if (!slot.getDoctor().getId().equals(doctorId)) {
            throw new SlotNotFoundException("Slot " + slotId + " does not belong to doctor " + doctorId);
        }

        slot.setBooked(true);
        availabilityRepository.save(slot);
        log.info("Marked slot {} as booked for doctor {}", slotId, doctorId);
    }

    @Transactional
    public Map<String, Long> purgeUserData(String userId) {
        String normalizedUserId = userId == null ? "" : userId.trim();

        long deletedPatientPrescriptions = prescriptionRepository.deleteByPatientId(normalizedUserId);
        long deletedDoctorPrescriptions = 0;
        long deletedDoctorProfiles = 0;

        Doctor doctor = doctorRepository.findByUserId(normalizedUserId).orElse(null);
        if (doctor != null) {
            deletedDoctorPrescriptions = prescriptionRepository.deleteByDoctor_Id(doctor.getId());
            doctorRepository.delete(doctor);
            deletedDoctorProfiles = 1;
        }

        Map<String, Long> result = new LinkedHashMap<>();
        result.put("deletedDoctorProfiles", deletedDoctorProfiles);
        result.put("deletedDoctorPrescriptions", deletedDoctorPrescriptions);
        result.put("deletedPatientPrescriptions", deletedPatientPrescriptions);
        result.put("totalDeleted", deletedDoctorProfiles + deletedDoctorPrescriptions + deletedPatientPrescriptions);
        return result;
    }

    private BookableDoctorResponse toBookableDoctorResponse(Doctor doctor) {
        return BookableDoctorResponse.builder()
                .userId(doctor.getUserId())
                .id(doctor.getId())
                .firstName(doctor.getFirstName())
                .lastName(doctor.getLastName())
                .email(doctor.getEmail())
                .phone(doctor.getPhone())
                .specialization(doctor.getSpecialization())
                .qualifications(doctor.getQualifications())
                .experience(doctor.getExperience())
                .consultationFee(doctor.getConsultationFee())
                .bio(doctor.getBio())
                .avatarUrl(doctor.getAvatarUrl())
                .verified(doctor.isVerified())
                .build();
    }

    private DoctorResponse toDoctorResponse(Doctor doctor) {
        return DoctorResponse.builder()
                .id(doctor.getId())
                .firstName(doctor.getFirstName())
                .lastName(doctor.getLastName())
                .email(doctor.getEmail())
                .phone(doctor.getPhone())
                .specialization(doctor.getSpecialization())
                .qualifications(doctor.getQualifications())
                .experience(doctor.getExperience())
                .consultationFee(doctor.getConsultationFee())
                .bio(doctor.getBio())
                .avatarUrl(doctor.getAvatarUrl())
                .verified(doctor.isVerified())
                .build();
    }

    private AvailabilitySlotResponse toAvailabilitySlotResponse(DoctorAvailability slot) {
        return AvailabilitySlotResponse.builder()
                .id(slot.getId())
                .doctorId(slot.getDoctor().getId())
                .day(slot.getDay())
                .startTime(slot.getStartTime())
                .endTime(slot.getEndTime())
                .booked(slot.isBooked())
                .build();
    }
}
