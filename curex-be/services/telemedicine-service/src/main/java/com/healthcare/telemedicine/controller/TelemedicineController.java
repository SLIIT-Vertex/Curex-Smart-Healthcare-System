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
            @Valid @RequestBody(required = false) CreateSessionRequest request
    ) {
        CreateSessionRequest payload = request == null ? new CreateSessionRequest() : request;
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(telemedicineSessionService.createSession(appointmentId, payload));
    }

    @GetMapping("/appointments/{appointmentId}/session")
    @Operation(summary = "Get latest session for appointment")
    public ResponseEntity<SessionResponse> getSession(@PathVariable String appointmentId) {
        return ResponseEntity.ok(telemedicineSessionService.getLatestSessionForAppointment(appointmentId));
    }

    @PostMapping("/appointments/{appointmentId}/end")
    @Operation(summary = "End active session for appointment")
    public ResponseEntity<SessionResponse> endSession(
            @PathVariable String appointmentId,
            @RequestBody(required = false) EndSessionRequest request
    ) {
        EndSessionRequest payload = request == null ? new EndSessionRequest() : request;
        return ResponseEntity.ok(telemedicineSessionService.endSession(appointmentId, payload));
    }

    @GetMapping("/doctor/{doctorId}/sessions")
    @Operation(summary = "List doctor telemedicine sessions")
    public ResponseEntity<List<SessionResponse>> byDoctor(@PathVariable String doctorId) {
        return ResponseEntity.ok(telemedicineSessionService.getSessionsByDoctor(doctorId));
    }

    @GetMapping("/patient/{patientId}/sessions")
    @Operation(summary = "List patient telemedicine sessions")
    public ResponseEntity<List<SessionResponse>> byPatient(@PathVariable String patientId) {
        return ResponseEntity.ok(telemedicineSessionService.getSessionsByPatient(patientId));
    }
}
