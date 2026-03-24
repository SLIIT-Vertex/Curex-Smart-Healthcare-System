package com.curex.patient.controller;

import com.curex.patient.dto.*;
import com.curex.patient.feign.dto.PrescriptionResponse;
import com.curex.patient.service.PatientService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/patients")
@RequiredArgsConstructor
public class PatientController {

    private final PatientService patientService;

    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("OK");
    }

    @PostMapping
    public ResponseEntity<PatientResponse> create(@Valid @RequestBody CreatePatientRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(patientService.create(request));
    }

    @GetMapping("/by-user/{userId}")
    public ResponseEntity<PatientResponse> getByUserId(@PathVariable String userId) {
        return ResponseEntity.ok(patientService.getByUserId(userId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<PatientResponse> getById(@PathVariable String id) {
        return ResponseEntity.ok(patientService.getById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<PatientResponse> update(@PathVariable String id,
                                                  @Valid @RequestBody UpdatePatientRequest request) {
        return ResponseEntity.ok(patientService.update(id, request));
    }

    @GetMapping("/{id}/history")
    public ResponseEntity<MedicalHistoryResponse> getHistory(@PathVariable String id) {
        return ResponseEntity.ok(patientService.getHistory(id));
    }

    @PutMapping("/{id}/history")
    public ResponseEntity<MedicalHistoryResponse> updateHistory(@PathVariable String id,
                                                                @Valid @RequestBody UpdateMedicalHistoryRequest request) {
        return ResponseEntity.ok(patientService.updateHistory(id, request));
    }

    @GetMapping("/{id}/prescriptions")
    public ResponseEntity<List<PrescriptionResponse>> getPrescriptions(@PathVariable String id) {
        patientService.getById(id); // Validate patient exists
        return ResponseEntity.ok(patientService.getPrescriptions(id));
    }
}
