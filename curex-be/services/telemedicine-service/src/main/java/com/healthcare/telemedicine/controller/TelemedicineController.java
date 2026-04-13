package com.healthcare.telemedicine.controller;

import com.healthcare.telemedicine.dto.CreateSessionRequest;
import com.healthcare.telemedicine.dto.EndSessionRequest;
import com.healthcare.telemedicine.dto.SessionResponse;
import com.healthcare.telemedicine.service.TelemedicineSessionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/telemed")
@CrossOrigin(origins = "*")
@Tag(name = "Telemedicine", description = "Telemedicine session lifecycle APIs")
public class TelemedicineController {

    private final TelemedicineSessionService telemedicineSessionService;

    public TelemedicineController(TelemedicineSessionService telemedicineSessionService) {
        this.telemedicineSessionService = telemedicineSessionService;
    }

    @PostMapping("/appointments/{appointmentId}/session")
    @Operation(summary = "Create or retrieve active video consultation session")
    public ResponseEntity<SessionResponse> createSession(
            @PathVariable String appointmentId,
            @Valid @RequestBody(required = false) CreateSessionRequest request,
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestHeader(value = "X-User-Role", required = false) String userRole
    ) {
        requireAuthenticated(userId);
        if (!isRole(userRole, "PATIENT") && !isRole(userRole, "DOCTOR") && !isRole(userRole, "ADMIN")) {
            throw new ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Only PATIENT, DOCTOR or ADMIN can create sessions");
        }

        CreateSessionRequest payload = request == null ? new CreateSessionRequest() : request;

        // Never trust client-provided user IDs; default from authenticated identity.
        if (payload.getPatientId() == null || payload.getPatientId().isBlank()) {
            if (isRole(userRole, "PATIENT") || isRole(userRole, "ADMIN")) {
                payload.setPatientId(userId);
            }
        }
        if (payload.getDoctorId() == null || payload.getDoctorId().isBlank()) {
            if (isRole(userRole, "DOCTOR") || isRole(userRole, "ADMIN")) {
                payload.setDoctorId(userId);
            }
        }

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(telemedicineSessionService.createSession(appointmentId, payload));
    }

    @GetMapping("/appointments/{appointmentId}/session")
    @Operation(summary = "Get latest session for appointment")
    public ResponseEntity<SessionResponse> getSession(
            @PathVariable String appointmentId,
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestHeader(value = "X-User-Role", required = false) String userRole) {
        requireAuthenticated(userId);
        SessionResponse session = telemedicineSessionService.getLatestSessionForAppointment(appointmentId);
        authorizeSessionAccess(session, userId, userRole);
        return ResponseEntity.ok(session);
    }

    @PostMapping("/appointments/{appointmentId}/end")
    @Operation(summary = "End active session for appointment")
    public ResponseEntity<SessionResponse> endSession(
            @PathVariable String appointmentId,
            @RequestBody(required = false) EndSessionRequest request,
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestHeader(value = "X-User-Role", required = false) String userRole
    ) {
        requireAuthenticated(userId);
        if (!isRole(userRole, "DOCTOR") && !isRole(userRole, "ADMIN")) {
            throw new ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Only DOCTOR or ADMIN can end sessions");
        }

        EndSessionRequest payload = request == null ? new EndSessionRequest() : request;
        payload.setEndedBy(userId);

        if (isRole(userRole, "DOCTOR")) {
            SessionResponse session = telemedicineSessionService.getLatestSessionForAppointment(appointmentId);
            if (!userId.equals(session.getDoctorId())) {
                throw new ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Doctor can only end own sessions");
            }
        }

        return ResponseEntity.ok(telemedicineSessionService.endSession(appointmentId, payload));
    }

    @GetMapping("/doctor/{doctorId}/sessions")
    @Operation(summary = "List doctor telemedicine sessions")
    public ResponseEntity<List<SessionResponse>> byDoctor(
            @PathVariable String doctorId,
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestHeader(value = "X-User-Role", required = false) String userRole) {
        requireAuthenticated(userId);
        if (!isRole(userRole, "ADMIN")) {
            if (!isRole(userRole, "DOCTOR")) {
                throw new ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Only doctors can access doctor sessions");
            }
            requireSameUser(doctorId, userId, "Doctors can only access their own sessions");
        }
        return ResponseEntity.ok(telemedicineSessionService.getSessionsByDoctor(doctorId));
    }

    @GetMapping("/patient/{patientId}/sessions")
    @Operation(summary = "List patient telemedicine sessions")
    public ResponseEntity<List<SessionResponse>> byPatient(
            @PathVariable String patientId,
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestHeader(value = "X-User-Role", required = false) String userRole) {
        requireAuthenticated(userId);
        if (!isRole(userRole, "ADMIN")) {
            if (!isRole(userRole, "PATIENT")) {
                throw new ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Only patients can access patient sessions");
            }
            requireSameUser(patientId, userId, "Patients can only access their own sessions");
        }
        return ResponseEntity.ok(telemedicineSessionService.getSessionsByPatient(patientId));
    }

    private void requireAuthenticated(String userId) {
        if (userId == null || userId.isBlank()) {
            throw new ResponseStatusException(org.springframework.http.HttpStatus.UNAUTHORIZED, "Authentication required");
        }
    }

    private boolean isRole(String actualRole, String expectedRole) {
        return actualRole != null && expectedRole.equalsIgnoreCase(actualRole);
    }

    private void requireSameUser(String requestedUserId, String actualUserId, String message) {
        if (requestedUserId == null || !requestedUserId.equals(actualUserId)) {
            throw new ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, message);
        }
    }

    private void authorizeSessionAccess(SessionResponse session, String userId, String userRole) {
        if (isRole(userRole, "ADMIN")) {
            return;
        }
        if (isRole(userRole, "DOCTOR") && userId.equals(session.getDoctorId())) {
            return;
        }
        if (isRole(userRole, "PATIENT") && userId.equals(session.getPatientId())) {
            return;
        }
        throw new ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "You can only access your own sessions");
    }
}
