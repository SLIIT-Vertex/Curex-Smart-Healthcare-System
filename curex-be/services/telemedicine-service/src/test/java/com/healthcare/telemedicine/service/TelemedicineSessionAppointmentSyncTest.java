package com.healthcare.telemedicine.service;

import com.healthcare.telemedicine.dto.CreateSessionRequest;
import com.healthcare.telemedicine.dto.EndSessionRequest;
import com.healthcare.telemedicine.entity.SessionStatus;
import com.healthcare.telemedicine.entity.TelemedicineSession;
import com.healthcare.telemedicine.feign.AppointmentClient;
import com.healthcare.telemedicine.feign.dto.AppointmentStatus;
import com.healthcare.telemedicine.feign.dto.AppointmentSummary;
import com.healthcare.telemedicine.feign.dto.AppointmentType;
import com.healthcare.telemedicine.feign.dto.UpdateAppointmentRequest;
import com.healthcare.telemedicine.repository.TelemedicineSessionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Tests : when stub-mode is off, session start/end sync appointment status via Feign.
 * (Does not require a running appointment-service.)
 * <p>
 * Mockito matchers and {@link org.springframework.test.util.ReflectionTestUtils#setField} targets
 * are not {@code @NonNull} for Eclipse; Spring Data {@code save} expects {@code @NonNull} arguments.
 */
@ExtendWith(MockitoExtension.class)
@SuppressWarnings("null")
class TelemedicineSessionAppointmentSyncTest {

    private static final String APPT = "550e8400-e29b-41d4-a716-446655440000";

    @Mock
    private TelemedicineSessionRepository telemedicineSessionRepository;

    @Mock
    private RabbitTemplate rabbitTemplate;

    @Mock
    private AppointmentClient appointmentClient;

    @InjectMocks
    private TelemedicineSessionService telemedicineSessionService;

    @BeforeEach
    void enableLiveAppointmentIntegration() {
        ReflectionTestUtils.setField(telemedicineSessionService, "stubMode", false);
        ReflectionTestUtils.setField(telemedicineSessionService, "jitsiBaseUrl", "https://meet.jit.si");
    }

    private AppointmentSummary telemedAppointment() {
        AppointmentSummary s = new AppointmentSummary();
        s.setId(APPT);
        s.setPatientId("pat-1");
        s.setDoctorId("doc-1");
        s.setType(AppointmentType.TELEMEDICINE);
        s.setStatus(AppointmentStatus.CONFIRMED);
        return s;
    }

    @Test
    @DisplayName("Test B — create session PATCHes appointment to IN_SESSION")
    void createSession_updatesAppointmentToInSession() {
        when(telemedicineSessionRepository.findTopByAppointmentIdAndStatusNotOrderByCreatedAtDesc(eq(APPT), eq(SessionStatus.ENDED)))
                .thenReturn(Optional.empty());
        when(appointmentClient.getAppointment(APPT)).thenReturn(telemedAppointment());

        TelemedicineSession saved = TelemedicineSession.builder()
                .id(UUID.randomUUID().toString())
                .appointmentId(APPT)
                .patientId("pat-1")
                .doctorId("doc-1")
                .roomName("room")
                .sessionUrl("https://meet.jit.si/x")
                .status(SessionStatus.IN_SESSION)
                .startedAt(LocalDateTime.now())
                .build();
        when(telemedicineSessionRepository.save(any(TelemedicineSession.class))).thenReturn(saved);

        CreateSessionRequest req = new CreateSessionRequest();
        req.setPatientId("pat-1");
        req.setDoctorId("doc-1");

        telemedicineSessionService.createSession(APPT, req);

        ArgumentCaptor<UpdateAppointmentRequest> cap = ArgumentCaptor.forClass(UpdateAppointmentRequest.class);
        verify(appointmentClient).updateAppointment(eq(APPT), cap.capture());
        assertThat(cap.getValue().getStatus()).isEqualTo(AppointmentStatus.IN_SESSION);
    }

    @Test
    @DisplayName("Test C — end session can PATCH appointment to COMPLETED")
    void endSession_marksAppointmentCompletedWhenRequested() {
        TelemedicineSession active = TelemedicineSession.builder()
                .id(UUID.randomUUID().toString())
                .appointmentId(APPT)
                .patientId("pat-1")
                .doctorId("doc-1")
                .roomName("room")
                .sessionUrl("https://meet.jit.si/x")
                .status(SessionStatus.IN_SESSION)
                .startedAt(LocalDateTime.now())
                .build();
        when(telemedicineSessionRepository.findTopByAppointmentIdAndStatusNotOrderByCreatedAtDesc(eq(APPT), eq(SessionStatus.ENDED)))
                .thenReturn(Optional.of(active));
        when(telemedicineSessionRepository.save(any(TelemedicineSession.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        EndSessionRequest end = new EndSessionRequest();
        end.setEndedBy("doctor-123");
        end.setMarkAppointmentCompleted(true);

        telemedicineSessionService.endSession(APPT, end);

        ArgumentCaptor<UpdateAppointmentRequest> cap = ArgumentCaptor.forClass(UpdateAppointmentRequest.class);
        verify(appointmentClient).updateAppointment(eq(APPT), cap.capture());
        assertThat(cap.getValue().getStatus()).isEqualTo(AppointmentStatus.COMPLETED);
    }
}
