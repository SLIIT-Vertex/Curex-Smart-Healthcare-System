package com.curex.user.service;

import com.curex.user.dto.UpdateProfileRequest;
import com.curex.user.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isA;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProfileBridgeServiceSyncContractTest {

    @Mock
    private RestTemplate restTemplate;

    private ProfileBridgeService profileBridgeService;

    @BeforeEach
    void setUp() {
        profileBridgeService = new ProfileBridgeService(restTemplate);
        ReflectionTestUtils.setField(profileBridgeService, "doctorServiceUrl", "http://doctor-service:8084");
        ReflectionTestUtils.setField(profileBridgeService, "patientServiceUrl", "http://patient-service:8083");
    }

    @Test
        void syncAfterProfileUpdate_doctorRole_pushesRoleFieldsOnly() {
        User user = new User();
        user.setId("u-1");
        user.setRole(User.Role.DOCTOR);
        user.setFirstName("John");
        user.setLastName("Doe");
        user.setEmail("john@curex.com");

        UpdateProfileRequest request = new UpdateProfileRequest();
        request.setFirstName("John");
        request.setLastName("Doe");
        request.setPhoneNumber("+94710000000");
        request.setSpecialty("Cardiology");
        request.setMedicalLicenseNumber("SLMC-123");
        request.setProofDocumentUrls("https://proofs/doc1.pdf");
        request.setYearsOfExperience(8);

        Map<String, Object> doctorLookup = new HashMap<>();
        doctorLookup.put("id", "d-1");
        doctorLookup.put("specialization", "General Medicine");
        doctorLookup.put("qualifications", null);
        doctorLookup.put("medicalLicenseNumber", null);
        doctorLookup.put("proofDocumentUrls", null);
        doctorLookup.put("experience", 0);
        doctorLookup.put("bio", null);

        when(restTemplate.getForObject("http://doctor-service:8084/doctors/by-user/u-1", Map.class))
                .thenReturn(doctorLookup);

        profileBridgeService.syncAfterProfileUpdate(user, request);

        ArgumentCaptor<Map<String, Object>> payloadCaptor = ArgumentCaptor.forClass(Map.class);
        verify(restTemplate, times(1))
                .put(eq("http://doctor-service:8084/doctors/d-1"), payloadCaptor.capture());

        Map<String, Object> payload = payloadCaptor.getValue();
        assertThat(payload.get("specialization")).isEqualTo("Cardiology");
        assertThat(payload.get("medicalLicenseNumber")).isEqualTo("SLMC-123");
        assertThat(payload.get("proofDocumentUrls")).isEqualTo("https://proofs/doc1.pdf");
        assertThat(payload.get("experience")).isEqualTo(8);
    }

    @Test
        void syncAfterProfileUpdate_patientRole_pushesPatientDomainFieldsOnly() {
        User user = new User();
        user.setId("u-2");
        user.setRole(User.Role.PATIENT);
        user.setFirstName("Jane");
        user.setLastName("Roe");

        UpdateProfileRequest request = new UpdateProfileRequest();
        request.setPhoneNumber("+94712223333");
        request.setBloodGroup("A+");

        Map<String, Object> patientLookup = new HashMap<>();
        patientLookup.put("id", "p-1");
        patientLookup.put("dateOfBirth", null);
        patientLookup.put("gender", null);
        patientLookup.put("bloodType", null);
        patientLookup.put("address", null);

        when(restTemplate.getForObject("http://patient-service:8083/api/patients/by-user/u-2", Map.class))
                .thenReturn(patientLookup);

        profileBridgeService.syncAfterProfileUpdate(user, request);

        ArgumentCaptor<Map<String, Object>> payloadCaptor = ArgumentCaptor.forClass(Map.class);
        verify(restTemplate, times(1))
                .put(eq("http://patient-service:8083/api/patients/p-1"), payloadCaptor.capture());

        Map<String, Object> payload = payloadCaptor.getValue();
        assertThat(payload.get("bloodType")).isEqualTo("A+");

        verify(restTemplate, times(0)).exchange(
                isA(String.class),
                isA(org.springframework.http.HttpMethod.class),
                isA(org.springframework.http.HttpEntity.class),
                isA(org.springframework.core.ParameterizedTypeReference.class));
    }
}
