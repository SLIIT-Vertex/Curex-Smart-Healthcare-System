package com.curex.doctor.service;

import com.curex.doctor.config.RabbitMQConfig;
import com.curex.doctor.dto.IssuePrescriptionRequest;
import com.curex.doctor.dto.PrescriptionResponse;
import com.curex.doctor.entity.Doctor;
import com.curex.doctor.entity.Prescription;
import com.curex.doctor.entity.PrescriptionStatus;
import com.curex.doctor.event.PrescriptionIssuedEvent;
import com.curex.doctor.exception.InvalidPrescriptionException;
import com.curex.doctor.exception.ResourceNotFoundException;
import com.curex.doctor.feign.AppointmentClient;
import com.curex.doctor.feign.dto.AppointmentResponseDto;
import com.curex.doctor.repository.DoctorRepository;
import com.curex.doctor.repository.PrescriptionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
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

    private static final String IN_SESSION = "IN_SESSION";
    private static final String COMPLETED = "COMPLETED";

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

        // Validate appointment exists and is eligible for prescription (IN_SESSION or COMPLETED)
        AppointmentResponseDto appointment;
        try {
            appointment = appointmentClient.getAppointmentById(request.getAppointmentId());
        } catch (Exception e) {
            log.warn("Failed to fetch appointment {} from appointment-service: {}", request.getAppointmentId(), e.getMessage());
            throw new InvalidPrescriptionException("Appointment not found or appointment-service unavailable. Prescriptions are only allowed for ongoing or completed appointments.");
        }

        if (appointment == null) {
            throw new InvalidPrescriptionException("Appointment not found");
        }

        String status = appointment.getStatus();
        if (status == null || (!IN_SESSION.equals(status) && !COMPLETED.equals(status))) {
            throw new InvalidPrescriptionException(
                    "Prescriptions can only be issued for ongoing (IN_SESSION) or completed (COMPLETED) appointments. Current status: " + status);
        }

        if (!doctor.getId().equals(appointment.getDoctorId())) {
            throw new InvalidPrescriptionException("Appointment does not belong to this doctor");
        }
        if (!request.getPatientId().equals(appointment.getPatientId())) {
            throw new InvalidPrescriptionException("Appointment does not belong to this patient");
        }

        Prescription prescription = Prescription.builder()
                .doctor(doctor)
                .patientId(request.getPatientId())
                .appointmentId(request.getAppointmentId())
                .medicines(request.getMedicines())
                .instructions(request.getInstructions())
                .validFrom(validFrom)
                .validTo(validTo)
                .status(PrescriptionStatus.ACTIVE)
                .issuedAt(LocalDateTime.now())
                .build();

        prescription = prescriptionRepository.save(prescription);

        // Publish prescription.issued event for notification-service (required)
        PrescriptionIssuedEvent event = PrescriptionIssuedEvent.builder()
                .prescriptionId(prescription.getId())
                .doctorId(doctor.getId())
                .doctorName(doctor.getFullName())
                .patientId(request.getPatientId())
                .patientEmail(request.getPatientEmail())
                .medicines(request.getMedicines())
                .validFrom(prescription.getValidFrom())
                .validTo(prescription.getValidTo())
                .issuedAt(prescription.getIssuedAt())
                .build();
        rabbitTemplate.convertAndSend(RabbitMQConfig.DOCTOR_EXCHANGE,
                RabbitMQConfig.PRESCRIPTION_ISSUED_KEY, event);
        log.info("Published prescription.issued event for prescription {}", prescription.getId());

        log.info("Issued prescription {} for patient {}", prescription.getId(), request.getPatientId());
        return toPrescriptionResponse(prescription);
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

    private PrescriptionResponse toPrescriptionResponse(Prescription prescription) {
        return PrescriptionResponse.builder()
                .id(prescription.getId())
                .doctorId(prescription.getDoctor().getId())
                .doctorName(prescription.getDoctor().getFullName())
                .patientId(prescription.getPatientId())
                .appointmentId(prescription.getAppointmentId())
                .medicines(prescription.getMedicines())
                .instructions(prescription.getInstructions())
                .validFrom(prescription.getValidFrom())
                .validTo(prescription.getValidTo())
                .status(prescription.getStatus().name())
                .issuedAt(prescription.getIssuedAt())
                .build();
    }
}
