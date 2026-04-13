package com.curex.report.service;

import com.curex.report.entity.Report;
import com.curex.report.exception.InvalidFileException;
import com.curex.report.exception.ResourceNotFoundException;
import com.curex.report.repository.ReportRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
@Slf4j
public class ReportServiceImpl implements ReportService {

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("pdf", "png", "jpg", "jpeg", "webp");
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "application/pdf",
            "image/png",
            "image/jpeg",
            "image/jpg",
            "image/pjpeg",
            "image/webp");

    private final ReportRepository reportRepository;
    private final CloudinaryService cloudinaryService;

    @Override
    public Report uploadFile(String ownerId, String category, MultipartFile file) {
        if (!StringUtils.hasText(ownerId)) {
            throw new InvalidFileException("ownerId is required");
        }
        if (!StringUtils.hasText(category)) {
            throw new InvalidFileException("category is required");
        }
        if (file == null || file.isEmpty()) {
            throw new InvalidFileException("file is required and must not be empty");
        }

        String originalFilename = sanitizeOriginalFilename(file.getOriginalFilename());
        String extension = extractExtension(originalFilename);
        validateFileType(extension, file.getContentType());

        // Upload to Cloudinary using category as a subfolder
        // Resulting path: curex/{category}/{ownerId}
        Map<String, Object> uploadResult = cloudinaryService.upload(file, "curex/" + category.toLowerCase() + "/" + ownerId);
        String publicId = (String) uploadResult.get("public_id");
        String fileUrl = (String) uploadResult.get("secure_url");

        Report report = Report.builder()
                .ownerId(ownerId)
                .category(category.toUpperCase())
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
    public Report getFile(UUID id) {
        return reportRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("File not found: " + id));
    }

    @Override
    public List<Report> getFilesByOwner(String ownerId) {
        if (!StringUtils.hasText(ownerId)) {
            throw new InvalidFileException("ownerId is required");
        }
        return reportRepository.findByOwnerIdOrderByUploadedAtDesc(ownerId);
    }

    @Override
    public List<Report> getFilesByOwnerAndCategory(String ownerId, String category) {
        if (!StringUtils.hasText(ownerId) || !StringUtils.hasText(category)) {
            throw new InvalidFileException("ownerId and category are required");
        }
        return reportRepository.findByOwnerIdAndCategoryOrderByUploadedAtDesc(ownerId, category.toUpperCase());
    }

    @Override
    public void deleteFile(UUID id) {
        Report report = getFile(id);
        
        // Delete from Cloudinary - handle errors gracefully so DB record can still be deleted
        try {
            cloudinaryService.delete(report.getPublicId());
        } catch (Exception ex) {
            log.warn("Failed to delete Cloudinary asset {} for file {}: {}", report.getPublicId(), id, ex.getMessage());
        }
        
        reportRepository.delete(report);
    }

    @Override
    public int purgeUserData(String ownerId) {
        if (!StringUtils.hasText(ownerId)) {
            throw new InvalidFileException("ownerId is required");
        }

        List<Report> reports = reportRepository.findByOwnerIdOrderByUploadedAtDesc(ownerId.trim());
        for (Report report : reports) {
            try {
                cloudinaryService.delete(report.getPublicId());
            } catch (Exception ex) {
                log.warn("Failed to delete cloud asset {} for owner {}: {}", report.getPublicId(), ownerId, ex.getMessage());
            }
        }

        reportRepository.deleteAll(reports);
        return reports.size();
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
