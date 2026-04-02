package com.curex.doctor.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "prescriptions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Prescription {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "doctor_id", nullable = false)
    private Doctor doctor;

    @Column(name = "patient_id", nullable = false)
    private String patientId;

    @Column(name = "appointment_id")
    private String appointmentId;

    @Column(name = "patient_name")
    private String patientName;

    @Column(name = "diagnosis", columnDefinition = "TEXT")
    private String diagnosis;

    @Column(name = "medicines", nullable = false, columnDefinition = "TEXT")
    private String medicines;

    @Column(name = "instructions", columnDefinition = "TEXT")
    private String instructions;

    @Column(name = "valid_from", nullable = false)
    private LocalDate validFrom;

    @Column(name = "valid_to", nullable = false)
    private LocalDate validTo;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private PrescriptionStatus status = PrescriptionStatus.PENDING;

    @Column(name = "issued_at", nullable = false)
    private LocalDateTime issuedAt;
}
