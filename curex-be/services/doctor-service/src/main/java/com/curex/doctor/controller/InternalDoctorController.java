package com.curex.doctor.controller;

import com.curex.doctor.dto.BookableDoctorResponse;
import com.curex.doctor.service.DoctorService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Internal routes for service-to-service calls (not exposed through the API Gateway
 * under {@code /api/doctors/**}). Appointment-service should call these via direct
 * service URL (e.g. {@code http://doctor-service:8084}).
 */
@RestController
@RequestMapping("/internal/doctors")
@RequiredArgsConstructor
public class InternalDoctorController {

    private final DoctorService doctorService;

    @GetMapping("/approved-for-booking")
    public ResponseEntity<List<BookableDoctorResponse>> listApprovedForBooking() {
        return ResponseEntity.ok(doctorService.listApprovedForBooking());
    }
}
