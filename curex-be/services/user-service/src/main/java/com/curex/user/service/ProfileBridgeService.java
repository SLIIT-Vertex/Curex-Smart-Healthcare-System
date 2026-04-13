package com.curex.user.service;

import com.curex.user.dto.RegisterRequest;
import com.curex.user.dto.UpdateProfileRequest;
import com.curex.user.dto.UserResponse;
import com.curex.user.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProfileBridgeService {

    private final RestTemplate restTemplate;

    @Value("${services.doctor.url}")
    private String doctorServiceUrl;

    @Value("${services.patient.url}")
    private String patientServiceUrl;

    public UserResponse enrich(UserResponse response) {
        try {
            if (response.getRole() == User.Role.DOCTOR) {
                enrichDoctorFields(response);
            } else if (response.getRole() == User.Role.PATIENT) {
                enrichPatientFields(response);
            }
        } catch (Exception ex) {
            log.warn("Failed to enrich user {} role {}: {}", response.getId(), response.getRole(), ex.getMessage());
        }
        return response;
    }

    public void syncAfterRegistration(User user, RegisterRequest request) {
        if (user.getRole() == User.Role.DOCTOR) {
            ensureDoctorProfile(user, request);
            return;
        }
        if (user.getRole() == User.Role.PATIENT) {
            ensurePatientProfile(user, request);
        }
    }

    public void syncAfterProfileUpdate(User user, UpdateProfileRequest request) {
        if (user.getRole() == User.Role.DOCTOR) {
            syncDoctorProfile(user, request);
            return;
        }
        if (user.getRole() == User.Role.PATIENT) {
            syncPatientProfile(user, request);
        }
    }

    public Map<String, Object> getDoctorProfileByUserId(String userId) {
        String url = doctorServiceUrl + "/doctors/by-user/" + userId;
        Map<String, Object> doctor = restTemplate.getForObject(url, Map.class);
        return doctor == null ? Collections.emptyMap() : doctor;
    }

    public Map<String, Object> getPatientProfileByUserId(String userId) {
        String url = patientServiceUrl + "/api/patients/by-user/" + userId;
        Map<String, Object> patient = restTemplate.getForObject(url, Map.class);
        return patient == null ? Collections.emptyMap() : patient;
    }

    public Map<String, Object> bootstrapRoleProfile(User user) {
        RegisterRequest minimal = new RegisterRequest();
        if (user.getRole() == User.Role.DOCTOR) {
            ensureDoctorProfile(user, minimal);
            return getDoctorProfileByUserId(user.getId());
        }
        if (user.getRole() == User.Role.PATIENT) {
            ensurePatientProfile(user, minimal);
            return getPatientProfileByUserId(user.getId());
        }
        return Collections.emptyMap();
    }

    private void enrichDoctorFields(UserResponse response) {
        String url = doctorServiceUrl + "/doctors/by-user/" + response.getId();
        Map<String, Object> doctor = restTemplate.getForObject(url, Map.class);
        if (doctor == null) {
            return;
        }
        response.setSpecialty(str(doctor.get("specialization")));
        response.setMedicalLicenseNumber(str(doctor.get("medicalLicenseNumber")));
        response.setProofDocumentUrls(str(doctor.get("proofDocumentUrls")));
        response.setCertifications(str(doctor.get("qualifications")));
        response.setYearsOfExperience(intVal(doctor.get("experience")));
    }

    private void enrichPatientFields(UserResponse response) {
        String url = patientServiceUrl + "/api/patients/by-user/" + response.getId();
        Map<String, Object> patient = restTemplate.getForObject(url, Map.class);
        if (patient == null) {
            return;
        }

        response.setBloodGroup(str(patient.get("bloodType")));

        Map<String, Object> history = mapVal(patient.get("medicalHistory"));
        if (history != null) {
            response.setAllergies(joinCsv(listStr(history.get("allergies"))));
            response.setChronicConditions(joinCsv(listStr(history.get("conditions"))));
        }

        Map<String, Object> emergency = mapVal(patient.get("emergencyContact"));
        if (emergency != null) {
            response.setEmergencyContactName(str(emergency.get("name")));
            response.setEmergencyContactPhone(str(emergency.get("phone")));
        }
    }

    private void ensureDoctorProfile(User user, RegisterRequest request) {
        String getUrl = doctorServiceUrl + "/doctors/by-user/" + user.getId();
        try {
            restTemplate.getForObject(getUrl, Map.class);
            return;
        } catch (RestClientException ignored) {
            // Create if missing.
        }

        String postUrl = doctorServiceUrl + "/doctors";
        Map<String, Object> body = new HashMap<>();
        body.put("userId", user.getId());
        body.put("specialization", defaultIfBlank(request.getSpecialty(), "General Medicine"));
        body.put("qualifications", request.getCertifications());
        body.put("medicalLicenseNumber", request.getMedicalLicenseNumber());
        body.put("proofDocumentUrls", request.getProofDocumentUrls());
        body.put("experience", request.getYearsOfExperience());
        body.put("bio", user.getBio());

        try {
            restTemplate.postForObject(postUrl, body, Map.class);
        } catch (Exception ex) {
            log.warn("Failed creating doctor profile for user {}: {}", user.getId(), ex.getMessage());
        }
    }

    private void ensurePatientProfile(User user, RegisterRequest request) {
        String getUrl = patientServiceUrl + "/api/patients/by-user/" + user.getId();
        try {
            Map<String, Object> patient = restTemplate.getForObject(getUrl, Map.class);
            if (patient != null) {
                syncPatientHistoryAndEmergency(patient, request.getAllergies(), request.getChronicConditions(),
                        request.getEmergencyContactName(), request.getEmergencyContactPhone());
                return;
            }
        } catch (RestClientException ignored) {
            // Create if missing.
        }

        String postUrl = patientServiceUrl + "/api/patients";
        Map<String, Object> body = new HashMap<>();
        body.put("userId", user.getId());
        body.put("dateOfBirth", request.getDob());
        body.put("gender", request.getGender());
        body.put("bloodType", request.getBloodGroup());
        body.put("address", request.getAddress());

        try {
            Map<String, Object> created = restTemplate.postForObject(postUrl, body, Map.class);
            syncPatientHistoryAndEmergency(created, request.getAllergies(), request.getChronicConditions(),
                    request.getEmergencyContactName(), request.getEmergencyContactPhone());
        } catch (Exception ex) {
            log.warn("Failed creating patient profile for user {}: {}", user.getId(), ex.getMessage());
        }
    }

    private void syncDoctorProfile(User user, UpdateProfileRequest request) {
        String getUrl = doctorServiceUrl + "/doctors/by-user/" + user.getId();
        try {
            Map<String, Object> doctor = restTemplate.getForObject(getUrl, Map.class);
            if (doctor == null) {
                return;
            }

            String doctorId = str(doctor.get("id"));
            if (doctorId == null || doctorId.isBlank()) {
                return;
            }

            String putUrl = doctorServiceUrl + "/doctors/" + doctorId;
            Map<String, Object> update = new HashMap<>();
            update.put("specialization", coalesce(request.getSpecialty(), str(doctor.get("specialization"))));
            update.put("qualifications", coalesce(request.getCertifications(), str(doctor.get("qualifications"))));
            update.put("medicalLicenseNumber", coalesce(request.getMedicalLicenseNumber(), str(doctor.get("medicalLicenseNumber"))));
            update.put("proofDocumentUrls", coalesce(request.getProofDocumentUrls(), str(doctor.get("proofDocumentUrls"))));
            update.put("experience", coalesce(request.getYearsOfExperience(), intVal(doctor.get("experience"))));
            update.put("bio", coalesce(request.getBio(), str(doctor.get("bio"))));

            restTemplate.put(putUrl, update);
        } catch (Exception ex) {
            log.warn("Failed syncing doctor profile for user {}: {}", user.getId(), ex.getMessage());
        }
    }

    private void syncPatientProfile(User user, UpdateProfileRequest request) {
        String getUrl = patientServiceUrl + "/api/patients/by-user/" + user.getId();
        try {
            Map<String, Object> patient = restTemplate.getForObject(getUrl, Map.class);
            if (patient == null) {
                return;
            }

            String patientId = str(patient.get("id"));
            if (patientId == null || patientId.isBlank()) {
                return;
            }

            String putUrl = patientServiceUrl + "/api/patients/" + patientId;
            Map<String, Object> update = new HashMap<>();
            update.put("dateOfBirth", coalesce(request.getDob(), patient.get("dateOfBirth")));
            update.put("gender", coalesce(request.getGender(), str(patient.get("gender"))));
            update.put("bloodType", coalesce(request.getBloodGroup(), str(patient.get("bloodType"))));
            update.put("address", coalesce(request.getAddress(), str(patient.get("address"))));
            restTemplate.put(putUrl, update);

            syncPatientHistoryAndEmergency(patient, request.getAllergies(), request.getChronicConditions(),
                    request.getEmergencyContactName(), request.getEmergencyContactPhone());
        } catch (Exception ex) {
            log.warn("Failed syncing patient profile for user {}: {}", user.getId(), ex.getMessage());
        }
    }

    private void syncPatientHistoryAndEmergency(Map<String, Object> patient,
                                                String allergies,
                                                String conditions,
                                                String emergencyName,
                                                String emergencyPhone) {
        if (patient == null) {
            return;
        }
        String patientId = str(patient.get("id"));
        if (patientId == null || patientId.isBlank()) {
            return;
        }

        try {
            if (allergies != null || conditions != null) {
                String historyGetUrl = patientServiceUrl + "/api/patients/" + patientId + "/history";
                ResponseEntity<Map<String, Object>> historyResp = restTemplate.exchange(
                        historyGetUrl,
                        HttpMethod.GET,
                        HttpEntity.EMPTY,
                        new ParameterizedTypeReference<>() {
                        }
                );

                Map<String, Object> currentHistory = historyResp.getBody();
                List<String> currentAllergies = currentHistory == null ? Collections.emptyList() : listStr(currentHistory.get("allergies"));
                List<String> currentConditions = currentHistory == null ? Collections.emptyList() : listStr(currentHistory.get("conditions"));
                List<String> currentPast = currentHistory == null ? Collections.emptyList() : listStr(currentHistory.get("pastSurgeries"));

                Map<String, Object> updateHistory = new HashMap<>();
                updateHistory.put("allergies", allergies == null ? currentAllergies : csvToList(allergies));
                updateHistory.put("conditions", conditions == null ? currentConditions : csvToList(conditions));
                updateHistory.put("pastSurgeries", currentPast);

                String historyPutUrl = patientServiceUrl + "/api/patients/" + patientId + "/history";
                restTemplate.put(historyPutUrl, updateHistory);
            }

            if (emergencyName != null || emergencyPhone != null) {
                Map<String, Object> emergency = mapVal(patient.get("emergencyContact"));
                Map<String, Object> updateEmergency = new HashMap<>();
                updateEmergency.put("name", coalesce(emergencyName, emergency == null ? null : str(emergency.get("name"))));
                updateEmergency.put("phone", coalesce(emergencyPhone, emergency == null ? null : str(emergency.get("phone"))));
                updateEmergency.put("relationship", emergency == null ? null : str(emergency.get("relationship")));

                String emergencyPutUrl = patientServiceUrl + "/api/patients/" + patientId + "/emergency-contact";
                restTemplate.put(emergencyPutUrl, updateEmergency);
            }
        } catch (Exception ex) {
            log.warn("Failed syncing patient history/emergency for patient {}: {}", patientId, ex.getMessage());
        }
    }

    private static String str(Object v) {
        return v == null ? null : String.valueOf(v);
    }

    private static Integer intVal(Object v) {
        if (v == null) {
            return null;
        }
        if (v instanceof Number n) {
            return n.intValue();
        }
        try {
            return Integer.parseInt(String.valueOf(v));
        } catch (Exception ex) {
            return null;
        }
    }

    private static String joinCsv(List<String> items) {
        if (items == null || items.isEmpty()) {
            return null;
        }
        return String.join(", ", items);
    }

    private static List<String> csvToList(String csv) {
        if (csv == null || csv.isBlank()) {
            return Collections.emptyList();
        }
        String[] parts = csv.split(",");
        List<String> values = new ArrayList<>();
        for (String part : parts) {
            String trimmed = part.trim();
            if (!trimmed.isEmpty()) {
                values.add(trimmed);
            }
        }
        return values;
    }

    private static String defaultIfBlank(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private static <T> T coalesce(T first, T second) {
        return first != null ? first : second;
    }

    private static Map<String, Object> mapVal(Object value) {
        if (value instanceof Map<?, ?> map) {
            Map<String, Object> typed = new HashMap<>();
            for (Map.Entry<?, ?> entry : map.entrySet()) {
                typed.put(String.valueOf(entry.getKey()), entry.getValue());
            }
            return typed;
        }
        return null;
    }

    private static List<String> listStr(Object value) {
        if (value instanceof List<?> list) {
            List<String> out = new ArrayList<>();
            for (Object item : list) {
                if (item != null) {
                    out.add(String.valueOf(item));
                }
            }
            return out;
        }
        return Collections.emptyList();
    }

}