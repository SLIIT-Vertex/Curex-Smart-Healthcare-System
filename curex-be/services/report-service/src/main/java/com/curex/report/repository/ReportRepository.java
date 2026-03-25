package com.curex.report.repository;

import com.curex.report.entity.Report;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ReportRepository extends JpaRepository<Report, UUID> {

    List<Report> findByOwnerIdOrderByUploadedAtDesc(String ownerId);
    
    List<Report> findByOwnerIdAndCategoryOrderByUploadedAtDesc(String ownerId, String category);
}
