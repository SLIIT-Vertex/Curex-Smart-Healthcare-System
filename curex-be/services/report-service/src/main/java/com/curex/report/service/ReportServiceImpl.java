package com.curex.report.service;

import com.curex.report.entity.Report;
import com.curex.report.exception.InvalidFileException;
import com.curex.report.exception.ResourceNotFoundException;
import com.curex.report.repository.ReportRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Paths;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Map;
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
    private final CloudinaryService cloudinaryService;

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

        // Upload to Cloudinary
        Map<String, Object> uploadResult = cloudinaryService.upload(file, "curex/reports/" + patientId);
        String publicId = (String) uploadResult.get("public_id");
        String fileUrl = (String) uploadResult.get("secure_url");

        Report report = Report.builder()
                .patientId(patientId)
                .originalFilename(originalFilename)
                .publicId(publicId)
                .fileUrl(fileUrl)
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
    public List<Report> getReportsForPatient(String patientId) {
        if (!StringUtils.hasText(patientId)) {
            throw new InvalidFileException("patientId is required");
        }
        return reportRepository.findByPatientIdOrderByUploadedAtDesc(patientId);
    }

    @Override
    public void deleteReport(UUID id) {
        Report report = getReport(id);
        
        // Delete from Cloudinary
        cloudinaryService.delete(report.getPublicId());
        
        reportRepository.delete(report);
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
