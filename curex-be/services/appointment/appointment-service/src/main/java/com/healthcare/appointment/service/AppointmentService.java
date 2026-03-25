package com.healthcare.appointment.service;

import com.healthcare.appointment.config.RabbitMQConfig;
import com.healthcare.appointment.dto.*;
import com.healthcare.appointment.entity.Appointment;
import com.healthcare.appointment.entity.AppointmentStatus;

import com.healthcare.appointment.events.AppointmentBookedEvent;
import com.healthcare.appointment.events.AppointmentCancelledEvent;
import com.healthcare.appointment.events.PaymentConfirmedEvent;
import com.healthcare.appointment.feign.DoctorClient;
import com.healthcare.appointment.feign.dto.AvailabilitySlotDto;
import com.healthcare.appointment.repository.AppointmentRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
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

        // 2. Conflict check: same doctor, same ±30-minute window
        LocalDateTime from = req.getAppointmentTime().minusMinutes(30);
        LocalDateTime to   = req.getAppointmentTime().plusMinutes(30);
        List<Appointment> conflicts = appointmentRepository
                .findConflictingAppointments(req.getDoctorId(), from, to);
        if (!conflicts.isEmpty()) {
            throw new IllegalStateException(
                    "Doctor already has an appointment in this time window.");
        }

        // 3. Check slot availability via Feign (skipped in stub-mode)
        if (!stubMode && req.getSlotId() != null) {
            List<AvailabilitySlotDto> slots =
                    doctorClient.getAvailability(req.getDoctorId());
            boolean available = slots.stream()
                    .anyMatch(s -> s.getId().equals(req.getSlotId()) && !s.isBooked());
            if (!available) {
                throw new IllegalArgumentException("The selected slot is not available.");
            }
            doctorClient.markSlotBooked(req.getDoctorId(), req.getSlotId());
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
        } catch (Exception e) {
            // RabbitMQ might not be running during isolated testing – log and continue
            log.warn("Could not publish AppointmentBookedEvent: {}", e.getMessage());
        }
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
}
