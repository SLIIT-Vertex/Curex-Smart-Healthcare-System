package com.healthcare.appointment.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "appointments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Appointment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    // Patient info (comes from JWT / passed by API Gateway header in real flow)
    @Column(nullable = false)
    private String patientId;

    private String patientName;
    private String patientEmail;

    // Doctor info (to avoid Feign call for every read)
    @Column(nullable = false)
    private String doctorId;

    private String doctorName;
    @Column(name = "specialty", nullable = false)
    private String doctorSpecialty;

    // Slot reference (ID on doctor-service side)
    private String slotId;

    @Column(name = "appointment_time", nullable = false)
    private LocalDateTime appointmentTime;

    // Legacy DB compatibility: some environments still enforce NOT NULL on this old column.
    @Column(name = "appointment_date_time", nullable = false)
    private LocalDateTime legacyAppointmentDateTime;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private AppointmentStatus status = AppointmentStatus.PENDING;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AppointmentType type;

    // Payment reference (set by payment-service event)
    private String paymentId;

    // Telemedicine session URL (Jitsi)
    private String sessionUrl;

    // Optional notes from patient
    @Column(columnDefinition = "TEXT")
    private String notes;

    // Reason given when cancelling
    private String cancellationReason;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    @PrePersist
    @PreUpdate
    private void syncLegacyColumns() {
        this.legacyAppointmentDateTime = this.appointmentTime;
    }
}
