package com.healthcare.appointment.feign;

import com.healthcare.appointment.feign.dto.AvailabilitySlotDto;
import com.healthcare.appointment.feign.dto.BookableDoctorDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.List;

/**
 * Feign client to doctor-service (direct service URL, not via API Gateway).
 * Use {@link #getApprovedDoctorsForBooking()} for doctors approved by admin in user-service.
 */
@FeignClient(name = "doctor-service", url = "${services.doctor.url:http://localhost:8084}")
public interface DoctorClient {

    /**
     * Internal route — only admin-approved doctors (user account APPROVED) with a doctor profile.
     */
    @GetMapping("/doctors/bookable")
    List<BookableDoctorDto> getApprovedDoctorsForBooking();

    @GetMapping("/doctors/{id}/availability")
    List<AvailabilitySlotDto> getAvailability(@PathVariable("id") String doctorId);

    @PatchMapping("/doctors/{id}/availability/{slotId}/book")
    void markSlotBooked(@PathVariable("id") String doctorId,
                        @PathVariable("slotId") String slotId);
}
