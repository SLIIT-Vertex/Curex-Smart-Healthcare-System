package com.curex.patient.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "medical_histories")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MedicalHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_id", unique = true, nullable = false)
    private Patient patient;

    @Column(columnDefinition = "TEXT")
    private String conditions;

    @Column(columnDefinition = "TEXT")
    private String allergies;

    @Column(name = "past_surgeries", columnDefinition = "TEXT")
    private String pastSurgeries;
}
