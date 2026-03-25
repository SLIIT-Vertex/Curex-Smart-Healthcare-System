package com.curex.report.controller;

import com.curex.report.dto.ApiMessageResponse;
import com.curex.report.dto.ReportResponse;
import com.curex.report.dto.ReportUploadResponse;
import com.curex.report.entity.Report;
import com.curex.report.service.ReportService;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
@Validated
public class ReportController {

    private final ReportService reportService;

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ReportUploadResponse> upload(
            @RequestParam("patientId") @NotBlank String patientId,
            @RequestPart("file") MultipartFile file) {
        Report report = reportService.uploadReport(patientId, file);

        ReportUploadResponse payload = ReportUploadResponse.builder()
                .id(report.getId())
                .patientId(report.getPatientId())
                .originalFilename(report.getOriginalFilename())
                .contentType(report.getContentType())
                .fileSize(report.getFileSize())
                .downloadUrl(report.getFileUrl())
                .build();

        return ResponseEntity.ok(payload);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ReportResponse> getMetadata(@PathVariable UUID id) {
        Report report = reportService.getReport(id);

        ReportResponse payload = ReportResponse.builder()
                .id(report.getId())
                .patientId(report.getPatientId())
                .originalFilename(report.getOriginalFilename())
                .contentType(report.getContentType())
                .fileSize(report.getFileSize())
                .uploadedAt(report.getUploadedAt())
                .downloadUrl(report.getFileUrl())
                .build();

        return ResponseEntity.ok(payload);
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<Void> download(@PathVariable UUID id) {
        Report report = reportService.getReport(id);
        
        // Redirect to Cloudinary URL
        return ResponseEntity.status(302)
                .header(HttpHeaders.LOCATION, report.getFileUrl())
                .build();
    }

    @GetMapping("/patient/{patientId}")
    public ResponseEntity<List<ReportResponse>> listByPatient(@PathVariable @NotBlank String patientId) {
        List<ReportResponse> payload = reportService.getReportsForPatient(patientId).stream()
                .map(r -> ReportResponse.builder()
                        .id(r.getId())
                        .patientId(r.getPatientId())
                        .originalFilename(r.getOriginalFilename())
                        .contentType(r.getContentType())
                        .fileSize(r.getFileSize())
                        .uploadedAt(r.getUploadedAt())
                        .downloadUrl(r.getFileUrl())
                        .build())
                .toList();

        return ResponseEntity.ok(payload);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiMessageResponse> delete(@PathVariable UUID id) {
        reportService.deleteReport(id);
        return ResponseEntity.ok(ApiMessageResponse.of("Deleted report: " + id));
    }
}
