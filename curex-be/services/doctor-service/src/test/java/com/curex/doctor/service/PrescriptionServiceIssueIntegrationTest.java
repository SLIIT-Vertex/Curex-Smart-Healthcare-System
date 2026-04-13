package com.curex.doctor.service;

import com.curex.doctor.dto.IssuePrescriptionRequest;
import com.curex.doctor.dto.PrescriptionResponse;
import com.curex.doctor.entity.Doctor;
import com.curex.doctor.entity.Prescription;
import com.curex.doctor.exception.ForbiddenException;
import com.curex.doctor.exception.InvalidPrescriptionException;
import com.curex.doctor.feign.AppointmentClient;
import com.curex.doctor.feign.UserServiceClient;
import com.curex.doctor.feign.dto.AppointmentResponseDto;
import com.curex.doctor.repository.DoctorRepository;
import com.curex.doctor.repository.PrescriptionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Objects;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Tests : prescription issuance , eligibility, and security.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class PrescriptionServiceIssueIntegrationTest {

    private static final String APPT_ID = "appt-test-1";
    private static final String PATIENT_ID = "patient-auth-1";

    @Autowired
    private PrescriptionService prescriptionService;

    @Autowired
    private DoctorRepository doctorRepository;

    @Autowired
    private PrescriptionRepository prescriptionRepository;

    @MockBean
    private AppointmentClient appointmentClient;

    @MockBean
    private RabbitTemplate rabbitTemplate;

    @MockBean
    private UserServiceClient userServiceClient;

    private Doctor primaryDoctor;
    private String primaryDoctorUserId = "user-doc-primary";

    @BeforeEach
    void setUp() {
        prescriptionRepository.deleteAll();
        doctorRepository.deleteAll();

        primaryDoctor = Objects.requireNonNull(doctorRepository.save(Objects.requireNonNull(Doctor.builder()
                .userId(primaryDoctorUserId)
                .specialization("General")
                .isVerified(true)
                .build())));
    }

    private IssuePrescriptionRequest newBaseRequest() {
        LocalDate today = LocalDate.now(ZoneId.of("UTC"));
        IssuePrescriptionRequest r = new IssuePrescriptionRequest();
        r.setDoctorId(primaryDoctor.getId());
        r.setPatientId(PATIENT_ID);
        r.setAppointmentId(APPT_ID);
        r.setMedicines("Aspirin, 100mg, daily, 7 days");
        r.setValidFrom(today);
        r.setValidTo(today.plusDays(30));
        return r;
    }

    private AppointmentResponseDto appointmentWithStatus(String status) {
        AppointmentResponseDto dto = new AppointmentResponseDto();
        dto.setId(APPT_ID);
        dto.setDoctorId(primaryDoctor.getId());
        dto.setPatientId(PATIENT_ID);
        dto.setPatientName("Pat Test");
        dto.setStatus(status);
        return dto;
    }

    private void mockAppointment(AppointmentResponseDto dto) {
        when(appointmentClient.getAppointmentById(APPT_ID)).thenReturn(dto);
    }

    @Nested
    @DisplayName("Tests F & G — visit phase persisted and returned")
    class VisitPhaseHappyPath {

        @Test
        void issue_whileInSession_recordsVisitStatusAtIssueInSession() {
            mockAppointment(appointmentWithStatus("IN_SESSION"));

            PrescriptionResponse res = prescriptionService.issue(
                    newBaseRequest(),
                    primaryDoctorUserId);

            assertThat(res.getVisitStatusAtIssue()).isEqualTo("IN_SESSION");

            Prescription stored = prescriptionRepository.findAll().get(0);
            assertThat(stored.getVisitStatusAtIssue()).isEqualTo("IN_SESSION");
            // prescription.issued is published in afterCommit(); default @Transactional test rolls back
            // without committing, so RabbitTemplate is not invoked in this harness.
        }

        @Test
        void issue_whenCompleted_recordsVisitStatusAtIssueCompleted() {
            mockAppointment(appointmentWithStatus("COMPLETED"));

            PrescriptionResponse res = prescriptionService.issue(
                    newBaseRequest(),
                    primaryDoctorUserId);

            assertThat(res.getVisitStatusAtIssue()).isEqualTo("COMPLETED");
            assertThat(prescriptionRepository.findAll().get(0).getVisitStatusAtIssue())
                    .isEqualTo("COMPLETED");
        }
    }

    @Nested
    @DisplayName("Tests H, I, J — reject ineligible appointment statuses")
    class IneligibleAppointmentStatus {

        @Test
        void rejectsConfirmed() {
            mockAppointment(appointmentWithStatus("CONFIRMED"));
            assertThatThrownBy(() -> prescriptionService.issue(newBaseRequest(), primaryDoctorUserId))
                    .isInstanceOf(InvalidPrescriptionException.class)
                    .hasMessageContaining("IN_SESSION");
        }

        @Test
        void rejectsPending() {
            mockAppointment(appointmentWithStatus("PENDING"));
            assertThatThrownBy(() -> prescriptionService.issue(newBaseRequest(), primaryDoctorUserId))
                    .isInstanceOf(InvalidPrescriptionException.class);
        }

        @Test
        void rejectsCancelled() {
            mockAppointment(appointmentWithStatus("CANCELLED"));
            assertThatThrownBy(() -> prescriptionService.issue(newBaseRequest(), primaryDoctorUserId))
                    .isInstanceOf(InvalidPrescriptionException.class);
        }
    }

    @Nested
    @DisplayName("Tests K, L, M — security")
    class SecurityChecks {

        @Test
        void testK_rejectsWhenDoctorDoesNotOwnAppointment() {
            mockAppointment(appointmentWithStatus("IN_SESSION"));
            // Appointment belongs to primaryDoctor; request targets another doctor id
            Doctor other = Objects.requireNonNull(doctorRepository.save(Objects.requireNonNull(Doctor.builder()
                    .userId("user-other")
                    .specialization("GP")
                    .isVerified(true)
                    .build())));

            IssuePrescriptionRequest req = newBaseRequest();
            req.setDoctorId(other.getId());

            assertThatThrownBy(() -> prescriptionService.issue(req, "user-other"))
                    .isInstanceOf(ForbiddenException.class)
                    .hasMessageContaining("another doctor");
        }

        @Test
        void testL_rejectsWhenPatientIdDoesNotMatchAppointment() {
            AppointmentResponseDto dto = appointmentWithStatus("IN_SESSION");
            dto.setPatientId("expected-patient");
            mockAppointment(dto);

            IssuePrescriptionRequest req = newBaseRequest();
            req.setPatientId("wrong-patient");

            assertThatThrownBy(() -> prescriptionService.issue(req, primaryDoctorUserId))
                    .isInstanceOf(InvalidPrescriptionException.class)
                    .hasMessageContaining("Patient ID");
        }

        @Test
        void testM_rejectsWhenCallerUserIdDoesNotMatchPrescribingDoctor() {
            mockAppointment(appointmentWithStatus("IN_SESSION"));

            assertThatThrownBy(() -> prescriptionService.issue(newBaseRequest(), "intruder-user"))
                    .isInstanceOf(ForbiddenException.class)
                    .hasMessageContaining("Authenticated user");
        }
    }

    @Nested
    @DisplayName("Test N — one prescription per appointment")
    class DuplicatePerAppointment {

        @Test
        void secondIssueForSameAppointmentRejected() {
            mockAppointment(appointmentWithStatus("IN_SESSION"));

            prescriptionService.issue(newBaseRequest(), primaryDoctorUserId);

            assertThatThrownBy(() -> prescriptionService.issue(newBaseRequest(), primaryDoctorUserId))
                    .isInstanceOf(InvalidPrescriptionException.class)
                    .hasMessageContaining("already exists");
        }
    }

    @Nested
    @DisplayName("Regression — missing auth header")
    class CallerRequired {

        @Test
        void rejectsNullRequestingUserId() {
            mockAppointment(appointmentWithStatus("IN_SESSION"));
            assertThatThrownBy(() -> prescriptionService.issue(newBaseRequest(), null))
                    .isInstanceOf(ForbiddenException.class);
            verify(rabbitTemplate, never()).convertAndSend(anyString(), anyString(), any(Object.class));
        }
    }
}
