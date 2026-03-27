package com.curex.report.service;

import com.curex.report.entity.Report;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

public interface ReportService {

    Report uploadFile(String ownerId, String category, MultipartFile file);

    Report getFile(UUID id);

    List<Report> getFilesByOwner(String ownerId);
    
    List<Report> getFilesByOwnerAndCategory(String ownerId, String category);

    void deleteFile(UUID id);

    int purgeUserData(String ownerId);
}
