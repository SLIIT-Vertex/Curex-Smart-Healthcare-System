package com.curex.patient.service;

import com.curex.patient.dto.*;
import com.curex.patient.entity.EmergencyContact;
import com.curex.patient.feign.DoctorServiceClient;
import com.curex.patient.feign.dto.PrescriptionResponse;
import com.curex.patient.entity.MedicalHistory;
import com.curex.patient.entity.Patient;
import com.curex.patient.exception.PatientAlreadyExistsException;
import com.curex.patient.exception.ResourceNotFoundException;
import com.curex.patient.repository.EmergencyContactRepository;
import com.curex.patient.repository.MedicalHistoryRepository;
import com.curex.patient.repository.PatientRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.Collections;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class PatientService {

    private final PatientRepository patientRepository;
    private final MedicalHistoryRepository medicalHistoryRepository;
    private final EmergencyContactRepository emergencyContactRepository;
    private final DoctorServiceClient doctorServiceClient;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Transactional
    public PatientResponse create(CreatePatientRequest request) {
        if (patientRepository.existsByUserId(request.getUserId())) {
            throw new PatientAlreadyExistsException("Patient profile already exists for user: " + request.getUserId());
        }
        if (patientRepository.existsByEmail(request.getEmail())) {
            throw new PatientAlreadyExistsException("A patient with email " + request.getEmail() + " already exists");
        }

        Patient patient = Patient.builder()
                .userId(request.getUserId())
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .email(request.getEmail())
                .phone(request.getPhone())
                .dateOfBirth(request.getDateOfBirth())
                .gender(request.getGender())
                .bloodType(request.getBloodType())
                .address(request.getAddress())
                .build();

        patient = patientRepository.save(patient);
        log.info("Created patient profile for user {}", request.getUserId());
        return toPatientResponse(patient);
    }

    @Transactional(readOnly = true)
    public PatientResponse getById(String id) {
        Patient patient = patientRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found with id: " + id));
        return toPatientResponse(patient);
    }

    @Transactional(readOnly = true)
    public PatientResponse getByUserId(String userId) {
        Patient patient = patientRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found for user id: " + userId));
        return toPatientResponse(patient);
    }

    @Transactional
    public PatientResponse update(String id, UpdatePatientRequest request) {
        Patient patient = patientRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found with id: " + id));

        if (request.getFirstName() != null) patient.setFirstName(request.getFirstName());
        if (request.getLastName() != null) patient.setLastName(request.getLastName());
        if (request.getPhone() != null) patient.setPhone(request.getPhone());
        if (request.getDateOfBirth() != null) patient.setDateOfBirth(request.getDateOfBirth());
        if (request.getGender() != null) patient.setGender(request.getGender());
        if (request.getBloodType() != null) patient.setBloodType(request.getBloodType());
        if (request.getAddress() != null) patient.setAddress(request.getAddress());

        patient = patientRepository.save(patient);
        log.info("Updated patient profile {}", id);
        return toPatientResponse(patient);
    }

    @Transactional(readOnly = true)
    public MedicalHistoryResponse getHistory(String patientId) {
        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found with id: " + patientId));

        MedicalHistory history = patient.getMedicalHistory();
        if (history == null) {
            return MedicalHistoryResponse.builder()
                    .id(null)
                    .conditions(Collections.emptyList())
                    .allergies(Collections.emptyList())
                    .pastSurgeries(Collections.emptyList())
                    .build();
        }
        return toMedicalHistoryResponse(history);
    }

    @Transactional
    public MedicalHistoryResponse updateHistory(String patientId, UpdateMedicalHistoryRequest request) {
        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found with id: " + patientId));

        MedicalHistory history = patient.getMedicalHistory();
        if (history == null) {
            history = MedicalHistory.builder()
                    .patient(patient)
                    .conditions(stringifyList(request.getConditions()))
                    .allergies(stringifyList(request.getAllergies()))
                    .pastSurgeries(stringifyList(request.getPastSurgeries()))
                    .build();
            history = medicalHistoryRepository.save(history);
            patient.setMedicalHistory(history);
            patientRepository.save(patient);
        } else {
            history.setConditions(stringifyList(request.getConditions()));
            history.setAllergies(stringifyList(request.getAllergies()));
            history.setPastSurgeries(stringifyList(request.getPastSurgeries()));
            history = medicalHistoryRepository.save(history);
        }
        log.info("Updated medical history for patient {}", patientId);
        return toMedicalHistoryResponse(history);
    }

    @Transactional
    public EmergencyContactResponse updateEmergencyContact(String patientId, UpdateEmergencyContactRequest request) {
        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found with id: " + patientId));

        EmergencyContact contact = emergencyContactRepository.findByPatient_Id(patientId)
                .orElseGet(() -> EmergencyContact.builder().patient(patient).build());

        if (request.getName() != null) {
            contact.setName(request.getName());
        }
        if (request.getPhone() != null) {
            contact.setPhone(request.getPhone());
        }
        if (request.getRelationship() != null) {
            contact.setRelationship(request.getRelationship());
        }

        // Keep DB constraint happy when caller sends only phone update.
        if (contact.getName() == null || contact.getName().isBlank()) {
            contact.setName("Emergency Contact");
        }

        contact = emergencyContactRepository.save(contact);
        if (patient.getEmergencyContact() == null) {
            patient.setEmergencyContact(contact);
            patientRepository.save(patient);
        }

        return toEmergencyContactResponse(contact);
    }

    /**
     * Doctor-service stores {@code patientId} as the user-service user id (same as on appointments).
     * Patient API paths use the patient-profile id; resolve to {@link Patient#getUserId()} for Feign.
     */
    public List<PrescriptionResponse> getPrescriptions(String patientProfileId) {
        Patient patient = patientRepository.findById(patientProfileId)
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found with id: " + patientProfileId));
        String doctorPatientKey = patient.getUserId() != null && !patient.getUserId().isBlank()
                ? patient.getUserId()
                : patientProfileId;
        try {
            return doctorServiceClient.getPrescriptionsByPatient(doctorPatientKey);
        } catch (Exception e) {
            log.warn("Failed to fetch prescriptions from doctor-service for patient profile {} (lookup {}): {}",
                    patientProfileId, doctorPatientKey, e.getMessage());
            return Collections.emptyList();
        }
    }

    @Transactional
    public Map<String, Long> purgeUserData(String userId) {
        String normalizedUserId = userId == null ? "" : userId.trim();
        long deletedProfiles = patientRepository.deleteByUserId(normalizedUserId);

        Map<String, Long> result = new LinkedHashMap<>();
        result.put("deletedPatientProfiles", deletedProfiles);
        result.put("totalDeleted", deletedProfiles);
        return result;
    }

    private PatientResponse toPatientResponse(Patient patient) {
        MedicalHistoryResponse historyResponse = null;
        if (patient.getMedicalHistory() != null) {
            historyResponse = toMedicalHistoryResponse(patient.getMedicalHistory());
        }

        EmergencyContactResponse contactResponse = null;
        if (patient.getEmergencyContact() != null) {
            contactResponse = toEmergencyContactResponse(patient.getEmergencyContact());
        }

        return PatientResponse.builder()
                .id(patient.getId())
                .name(patient.getFullName())
                .email(patient.getEmail())
                .phone(patient.getPhone())
                .dateOfBirth(patient.getDateOfBirth())
                .gender(patient.getGender() != null ? patient.getGender().name() : null)
                .bloodType(patient.getBloodType())
                .address(patient.getAddress())
                .avatarUrl(patient.getAvatarUrl())
                .createdAt(patient.getCreatedAt())
                .medicalHistory(historyResponse)
                .emergencyContact(contactResponse)
                .build();
    }

    private MedicalHistoryResponse toMedicalHistoryResponse(MedicalHistory history) {
        return MedicalHistoryResponse.builder()
                .id(history.getId())
                .conditions(parseList(history.getConditions()))
                .allergies(parseList(history.getAllergies()))
                .pastSurgeries(parseList(history.getPastSurgeries()))
                .build();
    }

    private EmergencyContactResponse toEmergencyContactResponse(EmergencyContact contact) {
        return EmergencyContactResponse.builder()
                .id(contact.getId())
                .name(contact.getName())
                .relationship(contact.getRelationship())
                .phone(contact.getPhone())
                .build();
    }

    private String stringifyList(List<String> list) {
        if (list == null || list.isEmpty()) return "[]";
        try {
            return objectMapper.writeValueAsString(list);
        } catch (Exception e) {
            return "[]";
        }
    }

    private List<String> parseList(String json) {
        if (json == null || json.isBlank()) return Collections.emptyList();
        try {
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }
}
