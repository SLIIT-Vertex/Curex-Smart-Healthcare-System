package com.curex.report.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.util.UUID;

@Getter
@AllArgsConstructor
@Builder
public class ReportUploadResponse {

    private final UUID id;
    private final String ownerId;
    private final String category;
    private final String originalFilename;
    private final String contentType;
    private final long fileSize;
    private final String downloadUrl;
}
