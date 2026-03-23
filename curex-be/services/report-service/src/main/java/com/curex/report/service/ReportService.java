package com.curex.report.service;

import com.curex.report.entity.Report;
import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

public interface ReportService {

    Report uploadReport(String patientId, MultipartFile file);

    Report getReport(UUID id);

    Resource loadReportAsResource(UUID id);

    List<Report> getReportsForPatient(String patientId);

    void deleteReport(UUID id);
}
