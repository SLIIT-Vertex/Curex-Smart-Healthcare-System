package com.curex.report.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "reports") // Still in reports table for now
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Report {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "owner_id", nullable = false)
    private String ownerId;

    @Column(nullable = false)
    private String category; // e.g. "PATIENT_REPORT", "PROFILE_IMAGE", "APPOINTMENT_DOC"

    @Column(nullable = false)
    private String originalFilename;

    @Column(nullable = false, unique = true)
    private String publicId;

    @Column(nullable = false)
    private String fileUrl;

    @Column(nullable = false)
    private String contentType;

    @Column(nullable = false)
    private long fileSize;

    @Column(nullable = false)
    private Instant uploadedAt;

    @PrePersist
    void onCreate() {
        if (uploadedAt == null) {
            uploadedAt = Instant.now();
        }
    }
}
