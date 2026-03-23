package com.curex.report.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.util.UUID;

@Getter
@AllArgsConstructor
@Builder
public class ReportResponse {

    private final UUID id;
    private final String patientId;
    private final String originalFilename;
    private final String contentType;
    private final long fileSize;
    private final Instant uploadedAt;

    /**
     * Convenience link for clients; populated by controller.
     */
    private final String downloadUrl;
}
