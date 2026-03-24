package com.healthcare.appointment.controller;

import com.healthcare.appointment.dto.*;
import com.healthcare.appointment.service.AppointmentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/appointments")
@Tag(name = "Appointments", description = "Book, manage, and track appointments")
@CrossOrigin(origins = "*") // remove in production – restrict to your frontend origin
public class AppointmentController {

    private final AppointmentService appointmentService;

    public AppointmentController(AppointmentService appointmentService) {
        this.appointmentService = appointmentService;
    }

    //  POST /api/appointments 
    @PostMapping
    @Operation(summary = "Book a new appointment")
    public ResponseEntity<AppointmentResponse> book(
            @Valid @RequestBody BookAppointmentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(appointmentService.bookAppointment(request));
    }

    //  GET /api/appointments 
    @GetMapping
    @Operation(summary = "Get all appointments (Admin use)")
    public ResponseEntity<List<AppointmentResponse>> getAll() {
        return ResponseEntity.ok(appointmentService.getAll());
    }

    //  GET /api/appointments/{id} 
    @GetMapping("/{id}")
    @Operation(summary = "Get appointment by ID")
    public ResponseEntity<AppointmentResponse> getById(@PathVariable String id) {
        return ResponseEntity.ok(appointmentService.getById(id));
    }

    //  GET /api/appointments/patient/{patientId} 
    @GetMapping("/patient/{patientId}")
    @Operation(summary = "Get all appointments for a patient")
    public ResponseEntity<List<AppointmentResponse>> byPatient(
            @PathVariable String patientId) {
        return ResponseEntity.ok(appointmentService.getByPatient(patientId));
    }

    //  GET /api/appointments/doctor/{doctorId} 
    @GetMapping("/doctor/{doctorId}")
    @Operation(summary = "Get all appointments for a doctor")
    public ResponseEntity<List<AppointmentResponse>> byDoctor(
            @PathVariable String doctorId) {
        return ResponseEntity.ok(appointmentService.getByDoctor(doctorId));
    }

    //  PATCH /api/appointments/{id} 
    @PatchMapping("/{id}")
    @Operation(summary = "Modify appointment (reschedule / change status)")
    public ResponseEntity<AppointmentResponse> update(
            @PathVariable String id,
            @RequestBody UpdateAppointmentRequest request) {
        return ResponseEntity.ok(appointmentService.updateAppointment(id, request));
    }

    //  PATCH /api/appointments/{id}/confirm 
    @PatchMapping("/{id}/confirm")
    @Operation(summary = "Doctor confirms the appointment")
    public ResponseEntity<AppointmentResponse> confirm(@PathVariable String id) {
        return ResponseEntity.ok(appointmentService.confirmAppointment(id));
    }

    //  DELETE /api/appointments/{id} 
    @DeleteMapping("/{id}")
    @Operation(summary = "Cancel an appointment")
    public ResponseEntity<AppointmentResponse> cancel(
            @PathVariable String id,
            @RequestParam(value = "reason", defaultValue = "Cancelled by user")
            String reason) {
        return ResponseEntity.ok(appointmentService.cancelAppointment(id, reason));
    }

    //  GET /api/appointments/search?specialty=Cardiology 
    @GetMapping("/search")
    @Operation(summary = "Search available appointments by doctor specialty")
    public ResponseEntity<List<AppointmentResponse>> search(
            @RequestParam(required = false) String specialty) {
        if (specialty == null || specialty.isBlank()) {
            return ResponseEntity.ok(appointmentService.getAll());
        }
        return ResponseEntity.ok(appointmentService.searchBySpecialty(specialty));
    }
}
