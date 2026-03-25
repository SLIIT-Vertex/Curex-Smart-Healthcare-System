package com.curex.report.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class CloudinaryService {

    private final Cloudinary cloudinary;

    public Map<String, Object> upload(MultipartFile file, String folder) {
        try {
            return cloudinary.uploader().upload(file.getBytes(), ObjectUtils.asMap(
                    "folder", folder,
                    "resource_type", "auto"
            ));
        } catch (IOException e) {
            log.error("Error uploading file to Cloudinary: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to upload file to Cloudinary", e);
        }
    }

    public void delete(String publicId) {
        try {
            cloudinary.uploader().destroy(publicId, ObjectUtils.emptyMap());
        } catch (IOException e) {
            log.error("Error deleting file from Cloudinary: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to delete file from Cloudinary", e);
        }
    }
}
