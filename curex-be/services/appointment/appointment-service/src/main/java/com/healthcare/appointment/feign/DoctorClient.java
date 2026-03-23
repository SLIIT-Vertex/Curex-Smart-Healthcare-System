package com.healthcare.appointment.feign;

import com.healthcare.appointment.feign.dto.AvailabilitySlotDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.List;

/**
 * Feign client to doctor-service.
 * When doctor-service is NOT running (during isolated testing), the
 * `feign.stub-mode` property in application.properties toggles this off –
 * the AppointmentService falls back to in-memory stub data instead.
 */
@FeignClient(name = "doctor-service", url = "${services.doctor.url:http://localhost:8084}")
public interface DoctorClient {

    @GetMapping("/doctors/{id}/availability")
    List<AvailabilitySlotDto> getAvailability(@PathVariable("id") String doctorId);

    @PatchMapping("/doctors/{id}/availability/{slotId}/book")
    void markSlotBooked(@PathVariable("id") String doctorId,
                        @PathVariable("slotId") String slotId);
}
