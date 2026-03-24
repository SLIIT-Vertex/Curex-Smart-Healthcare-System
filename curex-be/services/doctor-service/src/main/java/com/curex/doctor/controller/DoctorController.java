package com.curex.doctor.controller;

import com.curex.doctor.dto.*;
import com.curex.doctor.service.DoctorService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Doctor Service REST API.
 * Base path /doctors to match M4 appointment-service Feign client (DoctorClient).
 * Gateway should rewrite /api/doctors -> /doctors when forwarding.
 */
@RestController
@RequestMapping("/doctors")
@RequiredArgsConstructor
public class DoctorController {

    private final DoctorService doctorService;

    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("OK");
    }

    @PostMapping
    public ResponseEntity<DoctorResponse> create(@Valid @RequestBody CreateDoctorRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(doctorService.create(request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<DoctorResponse> getById(@PathVariable String id) {
        return ResponseEntity.ok(doctorService.getById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<DoctorResponse> update(@PathVariable String id,
                                                 @Valid @RequestBody UpdateDoctorRequest request) {
        return ResponseEntity.ok(doctorService.update(id, request));
    }

    @GetMapping("/search")
    public ResponseEntity<List<DoctorResponse>> search(@RequestParam(required = false) String specialty) {
        return ResponseEntity.ok(doctorService.searchBySpecialty(specialty));
    }

    @PostMapping("/{id}/availability")
    public ResponseEntity<List<AvailabilitySlotResponse>> addAvailability(@PathVariable String id,
                                                                          @Valid @RequestBody CreateAvailabilityBulkRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(doctorService.addAvailability(id, request));
    }

    @GetMapping("/{id}/availability")
    public ResponseEntity<List<AvailabilitySlotResponse>> getAvailability(@PathVariable String id) {
        return ResponseEntity.ok(doctorService.getAvailability(id));
    }

    @PatchMapping("/{id}/availability/{slotId}/book")
    public ResponseEntity<Void> markSlotBooked(@PathVariable String id, @PathVariable String slotId) {
        doctorService.markSlotBooked(id, slotId);
        return ResponseEntity.noContent().build();
    }
}
