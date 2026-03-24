package com.curex.doctor.controller;

import com.curex.doctor.dto.IssuePrescriptionRequest;
import com.curex.doctor.dto.PrescriptionResponse;
import com.curex.doctor.service.PrescriptionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Prescription API. Base path /prescriptions for Patient Service Feign (Phase 5)
 * and Frontend. Gateway routes /api/prescriptions/** here.
 */
@RestController
@RequestMapping("/prescriptions")
@RequiredArgsConstructor
public class PrescriptionController {

    private final PrescriptionService prescriptionService;

    @PostMapping
    public ResponseEntity<PrescriptionResponse> issue(@Valid @RequestBody IssuePrescriptionRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(prescriptionService.issue(request));
    }

    @GetMapping("/patient/{patientId}")
    public ResponseEntity<List<PrescriptionResponse>> getByPatient(@PathVariable String patientId) {
        return ResponseEntity.ok(prescriptionService.getByPatientId(patientId));
    }

    @GetMapping("/doctor/{doctorId}")
    public ResponseEntity<List<PrescriptionResponse>> getByDoctor(@PathVariable String doctorId) {
        return ResponseEntity.ok(prescriptionService.getByDoctorId(doctorId));
    }
}
