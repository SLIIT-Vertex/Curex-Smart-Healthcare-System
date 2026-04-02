package com.curex.doctor.service;

import com.curex.doctor.config.RabbitMQConfig;
import com.curex.doctor.dto.IssuePrescriptionRequest;
import com.curex.doctor.dto.PrescriptionResponse;
import com.curex.doctor.entity.Doctor;
import com.curex.doctor.entity.Prescription;
import com.curex.doctor.entity.PrescriptionStatus;
import com.curex.doctor.event.PrescriptionIssuedEvent;
import com.curex.doctor.exception.ForbiddenException;
import com.curex.doctor.exception.InvalidPrescriptionException;
import com.curex.doctor.exception.ResourceNotFoundException;
import com.curex.doctor.feign.AppointmentClient;
import com.curex.doctor.feign.dto.AppointmentResponseDto;
import com.curex.doctor.repository.DoctorRepository;
import com.curex.doctor.repository.PrescriptionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PrescriptionService {

    private final PrescriptionRepository prescriptionRepository;
    private final DoctorRepository doctorRepository;
    private final RabbitTemplate rabbitTemplate;
    private final AppointmentClient appointmentClient;

    @Value("${curex.prescriptions.status-zone:UTC}")
    private String prescriptionStatusZone;

    private static final String IN_SESSION = "IN_SESSION";
    private static final String COMPLETED = "COMPLETED";

    /** Doctor may cancel only inside this window after issue, or after the prescription becomes active. */
    private static final int CANCEL_GRACE_HOURS = 1;

    @Transactional
    public PrescriptionResponse issue(IssuePrescriptionRequest request) {
        Doctor doctor = doctorRepository.findById(request.getDoctorId())
                .orElseThrow(() -> new ResourceNotFoundException("Doctor not found with id: " + request.getDoctorId()));

        // Validate validity period
        LocalDate validFrom = request.getValidFrom();
        LocalDate validTo = request.getValidTo();
        if (validTo.isBefore(validFrom)) {
            throw new InvalidPrescriptionException("Valid to date must be on or after valid from date");
        }

        // Validate appointment exists and is eligible (IN_SESSION or COMPLETED)
        AppointmentResponseDto appointment;
        try {
            appointment = appointmentClient.getAppointmentById(request.getAppointmentId());
        } catch (Exception e) {
            log.warn("Failed to fetch appointment {} from appointment-service: {}", request.getAppointmentId(), e.getMessage());
            throw new InvalidPrescriptionException("Appointment not found or appointment-service unavailable.");
        }

        if (appointment == null) {
            throw new InvalidPrescriptionException("Appointment not found");
        }

        String status = appointment.getStatus();
        if (status == null || (!IN_SESSION.equals(status) && !COMPLETED.equals(status))) {
            throw new InvalidPrescriptionException(
                    "Prescriptions can only be issued for ongoing (IN_SESSION) or completed (COMPLETED) appointments. Current status: " + status);
        }

        // patientName: from request if provided, else from appointment
        String patientName = request.getPatientName();
        if (patientName == null || patientName.isBlank()) {
            patientName = appointment.getPatientName();
        }

        Prescription prescription = Prescription.builder()
                .doctor(doctor)
                .patientId(request.getPatientId())
                .appointmentId(request.getAppointmentId())
                .patientName(patientName)
                .diagnosis(request.getDiagnosis())
                .medicines(request.getMedicines())
                .instructions(request.getInstructions())
                .validFrom(validFrom)
                .validTo(validTo)
                // Stored placeholder; API status is date-derived via resolveEffectiveStatus (except CANCELLED).
                .status(PrescriptionStatus.PENDING)
                .issuedAt(LocalDateTime.now())
                .build();

        prescription = prescriptionRepository.save(prescription);

        // Publish prescription.issued event only after the DB transaction commits
        PrescriptionIssuedEvent event = PrescriptionIssuedEvent.builder()
                .prescriptionId(prescription.getId())
                .doctorId(doctor.getId())
                .doctorUserId(doctor.getUserId())
                .doctorName(doctor.getFullName())
                .doctorEmail(doctor.getEmail())
                .patientId(request.getPatientId())
                .patientName(prescription.getPatientName())
                .patientEmail(request.getPatientEmail())
                .diagnosis(request.getDiagnosis())
                .medicines(request.getMedicines())
                .instructions(request.getInstructions())
                .validFrom(prescription.getValidFrom())
                .validTo(prescription.getValidTo())
                .issuedAt(prescription.getIssuedAt())
                .build();
        String prescriptionId = prescription.getId();
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                rabbitTemplate.convertAndSend(RabbitMQConfig.DOCTOR_EXCHANGE,
                        RabbitMQConfig.PRESCRIPTION_ISSUED_KEY, event);
                log.info("Published prescription.issued event for prescription {}", prescriptionId);
            }
        });

        log.info("Issued prescription {} for patient {}", prescription.getId(), request.getPatientId());
        return toPrescriptionResponse(prescription);
    }

    @Transactional
    public PrescriptionResponse updateStatus(
            String prescriptionId,
            PrescriptionStatus newStatus,
            String requestingUserId) {
        if (newStatus != PrescriptionStatus.CANCELLED) {
            throw new InvalidPrescriptionException(
                    "Only cancellation is supported; active and completed states follow valid from / valid to dates.");
        }

        Prescription prescription = prescriptionRepository.findById(prescriptionId)
                .orElseThrow(() -> new ResourceNotFoundException("Prescription not found with id: " + prescriptionId));

        if (prescription.getStatus() == PrescriptionStatus.CANCELLED) {
            throw new InvalidPrescriptionException("This prescription is already cancelled.");
        }

        if (requestingUserId == null || requestingUserId.isBlank()) {
            throw new ForbiddenException("Authenticated doctor identity is required to cancel a prescription.");
        }

        Doctor doctor = prescription.getDoctor();
        String ownerUserId = doctor.getUserId();
        if (ownerUserId == null || !ownerUserId.equals(requestingUserId)) {
            throw new ForbiddenException("Only the prescribing doctor may cancel this prescription.");
        }

        if (!isWithinDoctorCancellationWindow(prescription)) {
            throw new InvalidPrescriptionException(
                    "A prescription can only be cancelled within 1 hour of being issued, "
                            + "or within 1 hour after it becomes active.");
        }

        prescription.setStatus(PrescriptionStatus.CANCELLED);
        prescription = prescriptionRepository.save(prescription);
        log.info("Cancelled prescription {} by doctor user {}", prescriptionId, requestingUserId);
        return toPrescriptionResponse(prescription);
    }

    /**
     * When the prescription first counts as active: midnight on {@code validFrom}, or {@code issuedAt}
     * if later (e.g. issued mid-day on the first valid day).
     */
    private LocalDateTime transitionToActiveInstant(Prescription prescription) {
        LocalDateTime startOfValidFrom = LocalDateTime.of(prescription.getValidFrom(), LocalTime.MIN);
        LocalDateTime issuedAt = prescription.getIssuedAt();
        return issuedAt.isAfter(startOfValidFrom) ? issuedAt : startOfValidFrom;
    }

    /**
     * Union of grace windows: 1 hour after issue, or 1 hour after becoming active (whichever applies).
     */
    private boolean isWithinDoctorCancellationWindow(Prescription prescription) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime issueDeadline = prescription.getIssuedAt().plusHours(CANCEL_GRACE_HOURS);
        LocalDateTime activeDeadline = transitionToActiveInstant(prescription).plusHours(CANCEL_GRACE_HOURS);
        return !now.isAfter(issueDeadline) || !now.isAfter(activeDeadline);
    }

    @Transactional(readOnly = true)
    public List<PrescriptionResponse> getByPatientId(String patientId) {
        return prescriptionRepository.findByPatientIdOrderByIssuedAtDesc(patientId).stream()
                .map(this::toPrescriptionResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<PrescriptionResponse> getByDoctorId(String doctorId) {
        if (!doctorRepository.existsById(doctorId)) {
            throw new ResourceNotFoundException("Doctor not found with id: " + doctorId);
        }
        return prescriptionRepository.findByDoctor_IdOrderByIssuedAtDesc(doctorId).stream()
                .map(this::toPrescriptionResponse)
                .collect(Collectors.toList());
    }

    /**
     * Effective status for API/UI: driven by validFrom / validTo vs today, except
     * {@link PrescriptionStatus#CANCELLED} which is terminal and stored explicitly.
     * <ul>
     *   <li>{@code PENDING} — today is before validFrom (issued but not yet active)</li>
     *   <li>{@code ACTIVE} — today is on or after validFrom and on or before validTo</li>
     *   <li>{@code COMPLETED} — today is after validTo (course finished)</li>
     * </ul>
     */
    private String resolveEffectiveStatus(Prescription prescription) {
        if (prescription.getStatus() == PrescriptionStatus.CANCELLED) {
            return PrescriptionStatus.CANCELLED.name();
        }
        LocalDate from = prescription.getValidFrom();
        LocalDate to = prescription.getValidTo();
        if (from == null || to == null) {
            return prescription.getStatus().name();
        }
        LocalDate today = todayForPrescriptionStatus();
        if (today.isBefore(from)) {
            return PrescriptionStatus.PENDING.name();
        }
        if (today.isAfter(to)) {
            return PrescriptionStatus.COMPLETED.name();
        }
        return PrescriptionStatus.ACTIVE.name();
    }

    /**
     * Uses {@link #prescriptionStatusZone} so PENDING/ACTIVE/COMPLETED match the same calendar the UI uses for validity
     * (Docker JVM default is often UTC, which can lag “today” for users ahead of UTC).
     */
    private LocalDate todayForPrescriptionStatus() {
        try {
            return LocalDate.now(ZoneId.of(prescriptionStatusZone.trim()));
        } catch (Exception e) {
            log.warn("Invalid curex.prescriptions.status-zone '{}', using UTC: {}", prescriptionStatusZone, e.getMessage());
            return LocalDate.now(ZoneId.of("UTC"));
        }
    }

    private PrescriptionResponse toPrescriptionResponse(Prescription prescription) {
        return PrescriptionResponse.builder()
                .id(prescription.getId())
                .doctorId(prescription.getDoctor().getId())
                .doctorName(prescription.getDoctor().getFullName())
                .doctorSpecialty(prescription.getDoctor().getSpecialization())
                .patientId(prescription.getPatientId())
                .patientName(prescription.getPatientName())
                .appointmentId(prescription.getAppointmentId())
                .diagnosis(prescription.getDiagnosis())
                .medicines(prescription.getMedicines())
                .instructions(prescription.getInstructions())
                .validFrom(prescription.getValidFrom())
                .validTo(prescription.getValidTo())
                .status(resolveEffectiveStatus(prescription))
                .issuedAt(prescription.getIssuedAt())
                .build();
    }
}
