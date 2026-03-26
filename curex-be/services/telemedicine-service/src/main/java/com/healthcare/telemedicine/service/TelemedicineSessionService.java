package com.healthcare.telemedicine.service;

import com.healthcare.telemedicine.config.RabbitMQConfig;
import com.healthcare.telemedicine.dto.CreateSessionRequest;
import com.healthcare.telemedicine.dto.EndSessionRequest;
import com.healthcare.telemedicine.dto.SessionResponse;
import com.healthcare.telemedicine.entity.SessionStatus;
import com.healthcare.telemedicine.entity.TelemedicineSession;
import com.healthcare.telemedicine.events.SessionCreatedEvent;
import com.healthcare.telemedicine.events.SessionEndedEvent;
import com.healthcare.telemedicine.feign.AppointmentClient;
import com.healthcare.telemedicine.feign.dto.AppointmentStatus;
import com.healthcare.telemedicine.feign.dto.AppointmentSummary;
import com.healthcare.telemedicine.feign.dto.AppointmentType;
import com.healthcare.telemedicine.feign.dto.UpdateAppointmentRequest;
import com.healthcare.telemedicine.repository.TelemedicineSessionRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;

@Service
@Slf4j
public class TelemedicineSessionService {

    private final TelemedicineSessionRepository telemedicineSessionRepository;
    private final RabbitTemplate rabbitTemplate;
    private final AppointmentClient appointmentClient;

    @Value("${telemedicine.stub-mode:true}")
    private boolean stubMode;

    @Value("${telemedicine.jitsi-base-url:https://meet.jit.si}")
    private String jitsiBaseUrl;

    public TelemedicineSessionService(
            TelemedicineSessionRepository telemedicineSessionRepository,
            RabbitTemplate rabbitTemplate,
            AppointmentClient appointmentClient
    ) {
        this.telemedicineSessionRepository = telemedicineSessionRepository;
        this.rabbitTemplate = rabbitTemplate;
        this.appointmentClient = appointmentClient;
    }

    @Transactional
    public SessionResponse createSession(String appointmentId, CreateSessionRequest request) {
        TelemedicineSession activeSession = telemedicineSessionRepository
                .findTopByAppointmentIdAndStatusNotOrderByCreatedAtDesc(appointmentId, SessionStatus.ENDED)
                .orElse(null);

        if (activeSession != null && !request.isForceNew()) {
            return toResponse(activeSession);
        }

        if (activeSession != null) {
            activeSession.setStatus(SessionStatus.ENDED);
            activeSession.setEndedAt(LocalDateTime.now());
            activeSession.setEndedBy("SYSTEM_FORCE_RESTART");
            telemedicineSessionRepository.save(activeSession);
        }

        String patientId = trimToNull(request.getPatientId());
        String doctorId = trimToNull(request.getDoctorId());

        if (!stubMode) {
            AppointmentSummary appointment = appointmentClient.getAppointment(appointmentId);
            validateAppointmentForTelemedicine(appointment);

            if (patientId == null) {
                patientId = trimToNull(appointment.getPatientId());
            }
            if (doctorId == null) {
                doctorId = trimToNull(appointment.getDoctorId());
            }
        }

        if (patientId == null || doctorId == null) {
            throw new IllegalArgumentException(
                    "patientId and doctorId are required when appointment integration is disabled"
            );
        }

        String roomName = generateRoomName(appointmentId);
        String sessionUrl = buildSessionUrl(roomName);

        TelemedicineSession session = TelemedicineSession.builder()
                .appointmentId(appointmentId)
                .patientId(patientId)
                .doctorId(doctorId)
                .roomName(roomName)
                .sessionUrl(sessionUrl)
                .status(SessionStatus.IN_SESSION)
                .startedAt(LocalDateTime.now())
                .build();

        TelemedicineSession saved = telemedicineSessionRepository.save(session);

        if (!stubMode) {
            updateAppointmentStatus(appointmentId, AppointmentStatus.IN_SESSION);
        }

        publishSessionCreated(saved);
        return toResponse(saved);
    }

    public SessionResponse getLatestSessionForAppointment(String appointmentId) {
        TelemedicineSession session = telemedicineSessionRepository
                .findTopByAppointmentIdOrderByCreatedAtDesc(appointmentId)
                .orElseThrow(() -> new NoSuchElementException(
                        "No telemedicine session found for appointment: " + appointmentId
                ));
        return toResponse(session);
    }

    public List<SessionResponse> getSessionsByDoctor(String doctorId) {
        return telemedicineSessionRepository.findByDoctorIdOrderByCreatedAtDesc(doctorId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public List<SessionResponse> getSessionsByPatient(String patientId) {
        return telemedicineSessionRepository.findByPatientIdOrderByCreatedAtDesc(patientId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public SessionResponse endSession(String appointmentId, EndSessionRequest request) {
        TelemedicineSession session = telemedicineSessionRepository
                .findTopByAppointmentIdAndStatusNotOrderByCreatedAtDesc(appointmentId, SessionStatus.ENDED)
                .orElseThrow(() -> new NoSuchElementException(
                        "No active telemedicine session found for appointment: " + appointmentId
                ));

        session.setStatus(SessionStatus.ENDED);
        session.setEndedAt(LocalDateTime.now());
        session.setEndedBy(trimToNull(request.getEndedBy()));
        session.setNotes(trimToNull(request.getNotes()));

        TelemedicineSession saved = telemedicineSessionRepository.save(session);

        if (!stubMode && request.isMarkAppointmentCompleted()) {
            updateAppointmentStatus(appointmentId, AppointmentStatus.COMPLETED);
        }

        publishSessionEnded(saved);
        return toResponse(saved);
    }

    @Transactional
    public Map<String, Long> purgeUserData(String userId) {
        String normalizedUserId = trimToNull(userId);
        if (normalizedUserId == null) {
            Map<String, Long> empty = new LinkedHashMap<>();
            empty.put("deletedAsPatient", 0L);
            empty.put("deletedAsDoctor", 0L);
            empty.put("totalDeleted", 0L);
            return empty;
        }

        long deletedAsPatient = telemedicineSessionRepository.deleteByPatientId(normalizedUserId);
        long deletedAsDoctor = telemedicineSessionRepository.deleteByDoctorId(normalizedUserId);

        Map<String, Long> result = new LinkedHashMap<>();
        result.put("deletedAsPatient", deletedAsPatient);
        result.put("deletedAsDoctor", deletedAsDoctor);
        result.put("totalDeleted", deletedAsPatient + deletedAsDoctor);
        return result;
    }

    private String buildSessionUrl(String roomName) {
        String normalizedBase = jitsiBaseUrl.endsWith("/")
                ? jitsiBaseUrl.substring(0, jitsiBaseUrl.length() - 1)
                : jitsiBaseUrl;
        return normalizedBase + "/" + roomName;
    }

    private String generateRoomName(String appointmentId) {
        String safeAppointmentId = appointmentId.replaceAll("[^a-zA-Z0-9]", "");
        String compactId = safeAppointmentId.length() > 12
                ? safeAppointmentId.substring(0, 12)
                : safeAppointmentId;
        return "consult-" + compactId.toLowerCase() + "-" + UUID.randomUUID().toString().substring(0, 8);
    }

    private void validateAppointmentForTelemedicine(AppointmentSummary appointment) {
        if (appointment == null || appointment.getId() == null) {
            throw new IllegalArgumentException("Appointment does not exist");
        }
        if (appointment.getType() != AppointmentType.TELEMEDICINE) {
            throw new IllegalArgumentException("Appointment is not TELEMEDICINE type");
        }
        if (appointment.getStatus() == AppointmentStatus.CANCELLED ||
                appointment.getStatus() == AppointmentStatus.COMPLETED) {
            throw new IllegalStateException("Cannot create session for appointment status: " + appointment.getStatus());
        }
    }

    private void updateAppointmentStatus(String appointmentId, AppointmentStatus status) {
        try {
            UpdateAppointmentRequest req = new UpdateAppointmentRequest();
            req.setStatus(status);
            appointmentClient.updateAppointment(appointmentId, req);
        } catch (Exception e) {
            log.warn("Failed to update appointment status for {}: {}", appointmentId, e.getMessage());
        }
    }

    private void publishSessionCreated(TelemedicineSession session) {
        try {
            rabbitTemplate.convertAndSend(
                    RabbitMQConfig.EXCHANGE,
                    RabbitMQConfig.SESSION_CREATED_KEY,
                    new SessionCreatedEvent(
                            session.getAppointmentId(),
                            session.getId(),
                            session.getSessionUrl(),
                            session.getPatientId(),
                            session.getDoctorId(),
                            session.getStartedAt()
                    )
            );
        } catch (Exception e) {
            log.warn("Could not publish SessionCreatedEvent: {}", e.getMessage());
        }
    }

    private void publishSessionEnded(TelemedicineSession session) {
        try {
            rabbitTemplate.convertAndSend(
                    RabbitMQConfig.EXCHANGE,
                    RabbitMQConfig.SESSION_ENDED_KEY,
                    new SessionEndedEvent(
                            session.getAppointmentId(),
                            session.getId(),
                            session.getPatientId(),
                            session.getDoctorId(),
                            session.getEndedAt(),
                            session.getEndedBy()
                    )
            );
        } catch (Exception e) {
            log.warn("Could not publish SessionEndedEvent: {}", e.getMessage());
        }
    }

    private SessionResponse toResponse(TelemedicineSession session) {
        return SessionResponse.builder()
                .id(session.getId())
                .appointmentId(session.getAppointmentId())
                .patientId(session.getPatientId())
                .doctorId(session.getDoctorId())
                .roomName(session.getRoomName())
                .sessionUrl(session.getSessionUrl())
                .status(session.getStatus())
                .startedAt(session.getStartedAt())
                .endedAt(session.getEndedAt())
                .endedBy(session.getEndedBy())
                .notes(session.getNotes())
                .createdAt(session.getCreatedAt())
                .updatedAt(session.getUpdatedAt())
                .build();
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
