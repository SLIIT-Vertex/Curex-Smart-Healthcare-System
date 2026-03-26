package com.healthcare.appointment.service;

import com.healthcare.appointment.config.RabbitMQConfig;
import com.healthcare.appointment.dto.*;
import com.healthcare.appointment.entity.Appointment;
import com.healthcare.appointment.entity.AppointmentStatus;

import com.healthcare.appointment.events.AppointmentBookedEvent;
import com.healthcare.appointment.events.AppointmentBookingNotificationEvent;
import com.healthcare.appointment.events.AppointmentCancelledEvent;
import com.healthcare.appointment.events.PaymentConfirmedEvent;
import com.healthcare.appointment.feign.DoctorClient;
import com.healthcare.appointment.feign.dto.AvailabilitySlotDto;
import com.healthcare.appointment.feign.dto.BookableDoctorDto;
import com.healthcare.appointment.repository.AppointmentRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import feign.FeignException;

import java.time.LocalDateTime;
import java.time.DayOfWeek;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Locale;
import java.util.stream.Collectors;

@Service
@Slf4j
public class AppointmentService {

    private final AppointmentRepository appointmentRepository;
    private final RabbitTemplate rabbitTemplate;

    /**
     * Feign client to doctor-service.
     * Injected as optional – when doctor-service is not running the
     * application still starts (stub-mode, see application.properties).
     */
    private final DoctorClient doctorClient;

    public AppointmentService(
            AppointmentRepository appointmentRepository,
            RabbitTemplate rabbitTemplate,
            DoctorClient doctorClient
    ) {
        this.appointmentRepository = appointmentRepository;
        this.rabbitTemplate = rabbitTemplate;
        this.doctorClient = doctorClient;
    }

    /** When true – skip Feign calls to doctor-service (isolated testing). */
    @Value("${appointment.stub-mode:true}")
    private boolean stubMode;
    @Transactional
    public AppointmentResponse bookAppointment(BookAppointmentRequest req) {

        // 1. Hard-stop any booking for now/past times on server side.
        if (req.getAppointmentTime() == null || !req.getAppointmentTime().isAfter(LocalDateTime.now())) {
            throw new IllegalArgumentException("Selected appointment time has already passed.");
        }

        // 2. Conflict check: same doctor, exact slot time only.
        boolean hasConflict = appointmentRepository.existsActiveConflictAtExactTime(
            req.getDoctorId(), req.getAppointmentTime());
        if (hasConflict) {
            throw new IllegalStateException(
                "Doctor already has an appointment at this exact time.");
        }

        // 3. Check slot availability via Feign (skipped in stub-mode)
        if (!stubMode && req.getSlotId() != null) {
            String requestedSlotId = req.getSlotId();
            boolean legacyDateSlotKey = requestedSlotId.contains("_");

            try {
                String doctorProfileId = resolveDoctorProfileIdForAvailability(req.getDoctorId());
                List<AvailabilitySlotDto> slots =
                        doctorClient.getAvailability(doctorProfileId);

                String selectedSlotId = resolveSelectedSlotId(req, slots);
                boolean available = selectedSlotId != null && slots.stream()
                        .anyMatch(s -> selectedSlotId.equals(s.getId()) && !s.isBooked());
                if (!available) {
                    throw new IllegalArgumentException("The selected slot is not available.");
                }
                doctorClient.markSlotBooked(doctorProfileId, selectedSlotId);
            } catch (Exception ex) {
                // Preserve previous booking behavior for legacy date_slot payloads when
                // doctor availability profile mapping is incomplete during integrations.
                if (legacyDateSlotKey) {
                    log.warn("Skipping strict slot validation for legacy slot key {} due to doctor-service lookup issue: {}",
                            requestedSlotId, ex.getMessage());
                } else {
                    throw ex;
                }
            }
        }

        // 4. Persist
        Appointment appt = Appointment.builder()
                .patientId(req.getPatientId())
                .patientName(req.getPatientName())
                .patientEmail(req.getPatientEmail())
                .doctorId(req.getDoctorId())
                .doctorName(req.getDoctorName())
                .doctorSpecialty(req.getDoctorSpecialty())
                .slotId(req.getSlotId())
                .appointmentTime(req.getAppointmentTime())
                .type(req.getType())
                .status(AppointmentStatus.PENDING)
                .notes(req.getNotes())
                .build();

        Appointment saved = appointmentRepository.save(appt);

        // 5. Publish event → Notification Service
        publishAppointmentBooked(saved);

        log.info("Appointment booked: id={} patient={} doctor={}",
                saved.getId(), saved.getPatientId(), saved.getDoctorId());

        return toResponse(saved);
    }

    //  Get By ID 

    public AppointmentResponse getById(String id) {
        return toResponse(findOrThrow(id));
    }

    //  Get By Patient 

    public List<AppointmentResponse> getByPatient(String patientId) {
        String normalizedPatientId = patientId == null ? "" : patientId.trim();
        List<Appointment> directMatches = appointmentRepository
                .findByPatientIdOrderByAppointmentTimeDesc(normalizedPatientId);

        String looseKey = normalizeLooseId(normalizedPatientId);
        List<Appointment> looseMatches = appointmentRepository.findAll().stream()
            .filter(a -> normalizeLooseId(a.getPatientId()).equals(looseKey))
            .collect(Collectors.toList());

        return mergeAndSortAppointments(directMatches, looseMatches)
            .stream().map(this::toResponse).collect(Collectors.toList());
    }

    //  Get By Doctor 

    public List<AppointmentResponse> getByDoctor(String doctorId) {
        String normalizedDoctorId = doctorId == null ? "" : doctorId.trim();
        List<Appointment> directMatches = appointmentRepository
                .findByDoctorIdOrderByAppointmentTimeDesc(normalizedDoctorId);

        String looseKey = normalizeLooseId(normalizedDoctorId);
        List<Appointment> looseMatches = appointmentRepository.findAll().stream()
            .filter(a -> normalizeLooseId(a.getDoctorId()).equals(looseKey))
            .collect(Collectors.toList());

        return mergeAndSortAppointments(directMatches, looseMatches)
            .stream().map(this::toResponse).collect(Collectors.toList());
    }

    //  Get All 

    public List<AppointmentResponse> getAll() {
        return appointmentRepository.findAll()
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    //  Update / Reschedule 

    @Transactional
    public AppointmentResponse updateAppointment(String id,
                                                  UpdateAppointmentRequest req) {
        Appointment appt = findOrThrow(id);

        // Rescheduling only allowed when PENDING
        if (req.getNewAppointmentTime() != null) {
            if (appt.getStatus() != AppointmentStatus.PENDING) {
                throw new IllegalStateException(
                        "Cannot reschedule an appointment that is not PENDING.");
            }
            LocalDateTime newTime = LocalDateTime.parse(
                    req.getNewAppointmentTime(),
                    DateTimeFormatter.ISO_LOCAL_DATE_TIME);
            appt.setAppointmentTime(newTime);
        }

        if (req.getStatus() != null) {
            appt.setStatus(req.getStatus());
        }

        return toResponse(appointmentRepository.save(appt));
    }

    //  Cancel 

    @Transactional
    public AppointmentResponse cancelAppointment(String id, String reason) {
        Appointment appt = findOrThrow(id);

        if (appt.getStatus() == AppointmentStatus.COMPLETED ||
            appt.getStatus() == AppointmentStatus.CANCELLED) {
            throw new IllegalStateException(
                    "Cannot cancel an appointment with status: " + appt.getStatus());
        }

        appt.setStatus(AppointmentStatus.CANCELLED);
        appt.setCancellationReason(reason);
        Appointment saved = appointmentRepository.save(appt);

        // Publish cancellation event
        publishAppointmentCancelled(saved);

        return toResponse(saved);
    }

    //  Confirm Appointment (called by Doctor) 

    @Transactional
    public AppointmentResponse confirmAppointment(String id) {
        Appointment appt = findOrThrow(id);
        if (appt.getStatus() != AppointmentStatus.PENDING) {
            throw new IllegalStateException(
                    "Only PENDING appointments can be confirmed.");
        }
        appt.setStatus(AppointmentStatus.CONFIRMED);
        return toResponse(appointmentRepository.save(appt));
    }

    //  Search by Specialty 

    public List<AppointmentResponse> searchBySpecialty(String specialty) {
        return appointmentRepository
                .findByDoctorSpecialtyIgnoreCaseAndStatus(specialty,
                        AppointmentStatus.PENDING)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    //  RabbitMQ Consumer: Payment Confirmed 

    @RabbitListener(queues = RabbitMQConfig.PAYMENT_CONFIRMED_QUEUE)
    @Transactional
    public void onPaymentConfirmed(PaymentConfirmedEvent event) {
        log.info("Payment confirmed event received: appointmentId={}",
                event.getAppointmentId());
        appointmentRepository.findById(event.getAppointmentId()).ifPresent(appt -> {
            appt.setStatus(AppointmentStatus.CONFIRMED);
            appt.setPaymentId(event.getPaymentId());
            appointmentRepository.save(appt);
            log.info("Appointment {} moved to CONFIRMED after payment.", appt.getId());
        });
    }

    //  Helpers 

    private Appointment findOrThrow(String id) {
        return appointmentRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException(
                        "Appointment not found with id: " + id));
    }

    private void publishAppointmentBooked(Appointment appt) {
        try {
            AppointmentBookedEvent event = new AppointmentBookedEvent(
                    appt.getId(),
                    appt.getPatientEmail(),
                    appt.getPatientName(),
                    appt.getDoctorName(),
                    appt.getAppointmentTime(),
                    appt.getType().name()
            );
            rabbitTemplate.convertAndSend(
                    RabbitMQConfig.EXCHANGE,
                    RabbitMQConfig.APPOINTMENT_BOOKED_KEY,
                    event);

            rabbitTemplate.convertAndSend(
                    RabbitMQConfig.NOTIFICATION_APPOINTMENT_EXCHANGE,
                    RabbitMQConfig.NOTIFICATION_APPOINTMENT_BOOKING_KEY,
                    toAppointmentBookingNotificationEvent(appt));
        } catch (Exception e) {
            // RabbitMQ might not be running during isolated testing – log and continue
            log.warn("Could not publish AppointmentBookedEvent: {}", e.getMessage());
        }
    }

            private AppointmentBookingNotificationEvent toAppointmentBookingNotificationEvent(Appointment appt) {
            return AppointmentBookingNotificationEvent.builder()
                .appointmentId(appt.getId())
                .patientId(appt.getPatientId())
                .patientEmail(appt.getPatientEmail())
                .patientName(appt.getPatientName())
                .doctorName(appt.getDoctorName())
                .appointmentDate(appt.getAppointmentTime().toLocalDate().toString())
                .appointmentTime(appt.getAppointmentTime().toLocalTime().toString())
                .build();
            }

    private void publishAppointmentCancelled(Appointment appt) {
        try {
            AppointmentCancelledEvent event = new AppointmentCancelledEvent(
                    appt.getId(),
                    appt.getPatientEmail(),
                    appt.getPatientName(),
                    appt.getDoctorName(),
                    appt.getCancellationReason()
            );
            rabbitTemplate.convertAndSend(
                    RabbitMQConfig.EXCHANGE,
                    RabbitMQConfig.APPOINTMENT_CANCELLED_KEY,
                    event);
        } catch (Exception e) {
            log.warn("Could not publish AppointmentCancelledEvent: {}", e.getMessage());
        }
    }

    private AppointmentResponse toResponse(Appointment a) {
        return AppointmentResponse.builder()
                .id(a.getId())
                .patientId(a.getPatientId())
                .patientName(a.getPatientName())
                .patientEmail(a.getPatientEmail())
                .doctorId(a.getDoctorId())
                .doctorName(a.getDoctorName())
                .doctorSpecialty(a.getDoctorSpecialty())
                .slotId(a.getSlotId())
                .appointmentTime(a.getAppointmentTime())
                .status(a.getStatus())
                .type(a.getType())
                .paymentId(a.getPaymentId())
                .sessionUrl(a.getSessionUrl())
                .notes(a.getNotes())
                .cancellationReason(a.getCancellationReason())
                .createdAt(a.getCreatedAt())
                .updatedAt(a.getUpdatedAt())
                .build();
    }

    private String normalizeLooseId(String id) {
        if (id == null) {
            return "";
        }
        return id.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", "");
    }

    private List<Appointment> mergeAndSortAppointments(
            List<Appointment> directMatches,
            List<Appointment> looseMatches
    ) {
        return java.util.stream.Stream.concat(directMatches.stream(), looseMatches.stream())
                .collect(Collectors.toMap(
                        Appointment::getId,
                        a -> a,
                        (existing, replacement) -> existing,
                        java.util.LinkedHashMap::new
                ))
                .values()
                .stream()
                .sorted(Comparator.comparing(Appointment::getAppointmentTime).reversed())
                .collect(Collectors.toList());
    }

    /**
     * Booking payload uses doctor user ID for ownership semantics, but doctor-service availability
     * endpoints require doctor profile ID. Resolve userId -> profileId when possible.
     */
    private String resolveDoctorProfileIdForAvailability(String doctorIdOrUserId) {
        try {
            return doctorClient.getApprovedDoctorsForBooking().stream()
                    .filter(d -> doctorIdOrUserId.equals(d.getUserId()) || doctorIdOrUserId.equals(d.getId()))
                    .map(d -> d.getId())
                    .findFirst()
                    .orElse(doctorIdOrUserId);
        } catch (Exception ex) {
            log.warn("Could not resolve doctor profile ID via approved-doctors list. Using provided doctor ID. reason={}", ex.getMessage());
            return doctorIdOrUserId;
        }
    }

    /**
     * JWT {@code userId} is the user-service account id; appointments and many APIs use the doctor <em>profile</em> id.
     * Allows the path/reference to be either profile id or the same user id (legacy / doctor dashboard using user id).
     */
    public boolean isAuthenticatedDoctorFor(String jwtUserId, String doctorProfileIdOrUserId) {
        if (jwtUserId == null || doctorProfileIdOrUserId == null || doctorProfileIdOrUserId.isBlank()) {
            return false;
        }
        String ref = doctorProfileIdOrUserId.trim();
        if (jwtUserId.equals(ref)) {
            return true;
        }
        try {
            BookableDoctorDto profile = doctorClient.getDoctorByUserId(jwtUserId);
            return profile != null
                    && profile.getId() != null
                    && profile.getId().trim().equals(ref);
        } catch (Exception ex) {
            log.warn("Could not resolve doctor profile for user {}: {}", jwtUserId, ex.getMessage());
            return false;
        }
    }

    /**
     * When the client passes the JWT user id as {@code /doctor/{id}}, translate to profile id for DB lookup.
     */
    public String resolveDoctorProfileIdForDoctorUser(String jwtUserId) {
        try {
            BookableDoctorDto profile = doctorClient.getDoctorByUserId(jwtUserId);
            if (profile == null || profile.getId() == null || profile.getId().isBlank()) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Doctor profile not found");
            }
            return profile.getId().trim();
        } catch (ResponseStatusException e) {
            throw e;
        } catch (FeignException.NotFound e) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Doctor profile not found", e);
        } catch (Exception ex) {
            log.warn("resolveDoctorProfileIdForDoctorUser failed: {}", ex.getMessage());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Unable to resolve doctor profile", ex);
        }
    }

    /**
     * Supports both slot UUID IDs and legacy date_slot keys (e.g. 2026-03-25_17:30).
     */
    private String resolveSelectedSlotId(BookAppointmentRequest req, List<AvailabilitySlotDto> slots) {
        if (slots == null || slots.isEmpty()) {
            return null;
        }

        String requestedSlotId = req.getSlotId();
        if (requestedSlotId == null || requestedSlotId.isBlank()) {
            return null;
        }

        boolean directIdMatch = slots.stream().anyMatch(s -> requestedSlotId.equals(s.getId()));
        if (directIdMatch) {
            return requestedSlotId;
        }

        // Legacy key format from frontend: yyyy-MM-dd_HH:mm
        String[] parts = requestedSlotId.split("_");
        if (parts.length != 2) {
            return null;
        }

        try {
            DayOfWeek expectedDay = req.getAppointmentTime().getDayOfWeek();
            LocalTime expectedTime = LocalTime.parse(parts[1]);

            return slots.stream()
                    .filter(s -> !s.isBooked())
                    .filter(s -> expectedDay.equals(s.getDay()))
                    .filter(s -> expectedTime.equals(s.getStartTime()))
                    .map(AvailabilitySlotDto::getId)
                    .findFirst()
                    .orElse(null);
        } catch (Exception ex) {
            return null;
        }
    }
}
