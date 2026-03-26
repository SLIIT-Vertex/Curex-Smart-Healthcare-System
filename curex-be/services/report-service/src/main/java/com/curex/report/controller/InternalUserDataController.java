package com.curex.report.controller;

import com.curex.report.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/internal/users")
@RequiredArgsConstructor
public class InternalUserDataController {

    private final ReportService reportService;

    @DeleteMapping("/{userId}/purge")
    public ResponseEntity<Map<String, Integer>> purgeUserData(@PathVariable String userId) {
        int deletedReports = reportService.purgeUserData(userId);
        return ResponseEntity.ok(Map.of(
                "deletedReports", deletedReports,
                "totalDeleted", deletedReports
        ));
    }
}
