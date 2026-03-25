package com.healthcare.appointment.controller;

import com.healthcare.appointment.dto.*;
import com.healthcare.appointment.service.AppointmentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.web.server.ResponseStatusException;
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
            @Valid @RequestBody BookAppointmentRequest request,
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestHeader(value = "X-User-Role", required = false) String userRole) {
        requireAuthenticated(userId);
        requireRole(userRole, "PATIENT");
        requireSameUser(request.getPatientId(), userId, "Patients can only create appointments for themselves");
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(appointmentService.bookAppointment(request));
    }

    //  GET /api/appointments 
    @GetMapping
    @Operation(summary = "Get all appointments (Admin use)")
    public ResponseEntity<List<AppointmentResponse>> getAll(
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestHeader(value = "X-User-Role", required = false) String userRole) {
        requireAuthenticated(userId);
        requireRole(userRole, "ADMIN");
        return ResponseEntity.ok(appointmentService.getAll());
    }

    //  GET /api/appointments/{id} 
    @GetMapping("/{id}")
    @Operation(summary = "Get appointment by ID")
    public ResponseEntity<AppointmentResponse> getById(
            @PathVariable String id,
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestHeader(value = "X-User-Role", required = false) String userRole) {
        requireAuthenticated(userId);
        AppointmentResponse appointment = appointmentService.getById(id);
        if (!isAdmin(userRole)
                && !userId.equals(appointment.getPatientId())
                && !appointmentService.isAuthenticatedDoctorFor(userId, appointment.getDoctorId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only access your own appointments");
        }
        return ResponseEntity.ok(appointment);
    }

    //  GET /api/appointments/patient/{patientId} 
    @GetMapping("/patient/{patientId}")
    @Operation(summary = "Get all appointments for a patient")
    public ResponseEntity<List<AppointmentResponse>> byPatient(
            @PathVariable String patientId,
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestHeader(value = "X-User-Role", required = false) String userRole) {
        requireAuthenticated(userId);
        if (!isAdmin(userRole)) {
            requireRole(userRole, "PATIENT");
            requireSameUser(patientId, userId, "Patients can only view their own appointments");
        }
        return ResponseEntity.ok(appointmentService.getByPatient(patientId));
    }

    //  GET /api/appointments/doctor/{doctorId} 
    @GetMapping("/doctor/{doctorId}")
    @Operation(summary = "Get all appointments for a doctor")
    public ResponseEntity<List<AppointmentResponse>> byDoctor(
            @PathVariable String doctorId,
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestHeader(value = "X-User-Role", required = false) String userRole) {
        requireAuthenticated(userId);
        String pathDoctorId = doctorId != null ? doctorId.trim() : "";
        if (!isAdmin(userRole)) {
            requireRole(userRole, "DOCTOR");
            if (!appointmentService.isAuthenticatedDoctorFor(userId, pathDoctorId)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "Doctors can only view their own appointments");
            }
        }
        String lookupDoctorId = pathDoctorId;
        if (userId.equals(pathDoctorId)) {
            lookupDoctorId = appointmentService.resolveDoctorProfileIdForDoctorUser(userId);
        }
        return ResponseEntity.ok(appointmentService.getByDoctor(lookupDoctorId));
    }

    //  PATCH /api/appointments/{id} 
    @PatchMapping("/{id}")
    @Operation(summary = "Modify appointment (reschedule / change status)")
    public ResponseEntity<AppointmentResponse> update(
            @PathVariable String id,
            @RequestBody UpdateAppointmentRequest request,
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestHeader(value = "X-User-Role", required = false) String userRole) {
        requireAuthenticated(userId);
        AppointmentResponse appointment = appointmentService.getById(id);
        if (!isAdmin(userRole)
                && !userId.equals(appointment.getPatientId())
                && !appointmentService.isAuthenticatedDoctorFor(userId, appointment.getDoctorId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only update your own appointments");
        }
        return ResponseEntity.ok(appointmentService.updateAppointment(id, request));
    }

    //  PATCH /api/appointments/{id}/confirm 
    @PatchMapping("/{id}/confirm")
    @Operation(summary = "Doctor confirms the appointment")
    public ResponseEntity<AppointmentResponse> confirm(
            @PathVariable String id,
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestHeader(value = "X-User-Role", required = false) String userRole) {
        requireAuthenticated(userId);
        requireRole(userRole, "DOCTOR");
        AppointmentResponse appointment = appointmentService.getById(id);
        if (!appointmentService.isAuthenticatedDoctorFor(userId, appointment.getDoctorId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Doctors can only confirm their own appointments");
        }
        return ResponseEntity.ok(appointmentService.confirmAppointment(id));
    }

    //  DELETE /api/appointments/{id} 
    @DeleteMapping("/{id}")
    @Operation(summary = "Cancel an appointment")
    public ResponseEntity<AppointmentResponse> cancel(
            @PathVariable String id,
            @RequestParam(value = "reason", defaultValue = "Cancelled by user")
            String reason,
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestHeader(value = "X-User-Role", required = false) String userRole) {
        requireAuthenticated(userId);
        AppointmentResponse appointment = appointmentService.getById(id);
        if (!isAdmin(userRole)
                && !userId.equals(appointment.getPatientId())
                && !appointmentService.isAuthenticatedDoctorFor(userId, appointment.getDoctorId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only cancel your own appointments");
        }
        return ResponseEntity.ok(appointmentService.cancelAppointment(id, reason));
    }

    //  GET /api/appointments/search?specialty=Cardiology 
    @GetMapping("/search")
    @Operation(summary = "Search available appointments by doctor specialty")
    public ResponseEntity<List<AppointmentResponse>> search(
            @RequestParam(required = false) String specialty,
            @RequestHeader(value = "X-User-Id", required = false) String userId) {
        requireAuthenticated(userId);
        if (specialty == null || specialty.isBlank()) {
            return ResponseEntity.ok(appointmentService.getAll());
        }
        return ResponseEntity.ok(appointmentService.searchBySpecialty(specialty));
    }

    private void requireAuthenticated(String userId) {
        if (userId == null || userId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }
    }

    private void requireRole(String actualRole, String expectedRole) {
        if (actualRole == null || !expectedRole.equalsIgnoreCase(actualRole)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Required role: " + expectedRole);
        }
    }

    private void requireSameUser(String requestedUserId, String actualUserId, String message) {
        if (requestedUserId == null || !requestedUserId.equals(actualUserId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, message);
        }
    }

    private boolean isAdmin(String role) {
        return role != null && "ADMIN".equalsIgnoreCase(role);
    }
}
