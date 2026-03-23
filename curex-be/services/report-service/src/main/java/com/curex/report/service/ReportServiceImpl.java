package com.curex.report.service;

import com.curex.report.config.FileStorageProperties;
import com.curex.report.entity.Report;
import com.curex.report.exception.InvalidFileException;
import com.curex.report.exception.ResourceNotFoundException;
import com.curex.report.repository.ReportRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ReportServiceImpl implements ReportService {

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("pdf", "png", "jpg", "jpeg");
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "application/pdf",
            "image/png",
            "image/jpeg");

    private final ReportRepository reportRepository;
    private final FileStorageProperties fileStorageProperties;

    private Path uploadBasePath;

    @PostConstruct
    void initStorage() {
        String configuredDir = fileStorageProperties.getUploadDir();
        if (!StringUtils.hasText(configuredDir)) {
            throw new IllegalStateException("file.upload-dir is not configured");
        }
        uploadBasePath = Paths.get(configuredDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(uploadBasePath);
        } catch (IOException e) {
            throw new IllegalStateException("Could not create upload directory: " + uploadBasePath, e);
        }
    }

    @Override
    public Report uploadReport(String patientId, MultipartFile file) {
        if (!StringUtils.hasText(patientId)) {
            throw new InvalidFileException("patientId is required");
        }
        if (file == null || file.isEmpty()) {
            throw new InvalidFileException("file is required and must not be empty");
        }

        String originalFilename = sanitizeOriginalFilename(file.getOriginalFilename());
        String extension = extractExtension(originalFilename);
        validateFileType(extension, file.getContentType());

        String storedFilename = UUID.randomUUID() + "." + extension;
        Path targetPath = uploadBasePath.resolve(storedFilename).normalize();

        try (InputStream inputStream = file.getInputStream()) {
            Files.copy(inputStream, targetPath, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new IllegalStateException("Failed to store file", e);
        }

        Report report = Report.builder()
                .patientId(patientId)
                .originalFilename(originalFilename)
                .storedFilename(storedFilename)
                .contentType(normalizeContentType(file.getContentType(), extension))
                .fileSize(file.getSize())
                .uploadedAt(Instant.now())
                .build();

        return reportRepository.save(report);
    }

    @Override
    public Report getReport(UUID id) {
        return reportRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Report not found: " + id));
    }

    @Override
    public Resource loadReportAsResource(UUID id) {
        Report report = getReport(id);
        Path filePath = uploadBasePath.resolve(report.getStoredFilename()).normalize();
        if (!Files.exists(filePath)) {
            throw new ResourceNotFoundException("Report file not found for id: " + id);
        }
        try {
            Resource resource = new UrlResource(filePath.toUri());
            if (!resource.exists()) {
                throw new ResourceNotFoundException("Report file not found for id: " + id);
            }
            return resource;
        } catch (MalformedURLException e) {
            throw new IllegalStateException("Invalid file path", e);
        }
    }

    @Override
    public List<Report> getReportsForPatient(String patientId) {
        if (!StringUtils.hasText(patientId)) {
            throw new InvalidFileException("patientId is required");
        }
        return reportRepository.findByPatientIdOrderByUploadedAtDesc(patientId);
    }

    @Override
    public void deleteReport(UUID id) {
        Report report = getReport(id);
        reportRepository.delete(report);

        Path filePath = uploadBasePath.resolve(report.getStoredFilename()).normalize();
        try {
            Files.deleteIfExists(filePath);
        } catch (IOException e) {
            throw new IllegalStateException("Failed to delete report file", e);
        }
    }

    private void validateFileType(String extension, String contentType) {
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new InvalidFileException("Unsupported file extension: " + extension);
        }
        if (contentType != null && !ALLOWED_CONTENT_TYPES.contains(contentType)) {
            // Stripe-style web uploads sometimes send null or generic types; extension
            // already validated.
            // If a content-type exists and is not allowed, reject.
            throw new InvalidFileException("Unsupported content type: " + contentType);
        }
    }

    private String sanitizeOriginalFilename(String originalFilename) {
        String cleaned = StringUtils.cleanPath(originalFilename == null ? "" : originalFilename);
        if (!StringUtils.hasText(cleaned)) {
            return "file";
        }
        // Prevent path traversal and keep only the last path segment.
        String fileNameOnly = Paths.get(cleaned).getFileName().toString();
        if (fileNameOnly.contains("..")) {
            throw new InvalidFileException("Invalid file name");
        }
        return fileNameOnly;
    }

    private String extractExtension(String filename) {
        int dot = filename.lastIndexOf('.');
        if (dot < 0 || dot == filename.length() - 1) {
            throw new InvalidFileException("File extension is required (pdf/png/jpg/jpeg)");
        }
        return filename.substring(dot + 1).toLowerCase(Locale.ROOT);
    }

    private String normalizeContentType(String contentType, String extension) {
        if (StringUtils.hasText(contentType)) {
            return contentType;
        }
        // Fallback for clients that don't provide content type
        return switch (extension) {
            case "pdf" -> "application/pdf";
            case "png" -> "image/png";
            case "jpg", "jpeg" -> "image/jpeg";
            default -> "application/octet-stream";
        };
    }
}
