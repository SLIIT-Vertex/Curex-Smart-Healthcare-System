package com.curex.doctor.controller;

import com.curex.doctor.dto.IssuePrescriptionRequest;
import com.curex.doctor.dto.PrescriptionResponse;
import com.curex.doctor.entity.PrescriptionStatus;
import com.curex.doctor.service.PrescriptionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/prescriptions")
@RequiredArgsConstructor
public class PrescriptionController {

    private final PrescriptionService prescriptionService;

    /**
     * The gateway forwards {@code X-User-Id} (JWT subject) so the caller must match the prescribing doctor.
     */
    @PostMapping
    public ResponseEntity<PrescriptionResponse> issue(
            @Valid @RequestBody IssuePrescriptionRequest request,
            @RequestHeader(value = "X-User-Id", required = false) String requestingUserId) {
        return ResponseEntity.status(HttpStatus.CREATED).body(prescriptionService.issue(request, requestingUserId));
    }

    /**
     * Only {@link PrescriptionStatus#CANCELLED} is supported. The gateway forwards
     * {@code X-User-Id} (JWT subject) so the prescribing doctor can be verified.
     */
    @PatchMapping("/{id}/status")
    public ResponseEntity<PrescriptionResponse> updateStatus(
            @PathVariable String id,
            @RequestBody Map<String, String> body,
            @RequestHeader(value = "X-User-Id", required = false) String requestingUserId) {
        PrescriptionStatus newStatus = PrescriptionStatus.valueOf(body.get("status"));
        return ResponseEntity.ok(prescriptionService.updateStatus(id, newStatus, requestingUserId));
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
