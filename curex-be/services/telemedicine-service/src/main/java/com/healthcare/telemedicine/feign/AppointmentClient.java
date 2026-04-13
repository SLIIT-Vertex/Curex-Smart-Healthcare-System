package com.healthcare.telemedicine.feign;

import com.healthcare.telemedicine.config.AppointmentFeignConfig;
import com.healthcare.telemedicine.feign.dto.AppointmentSummary;
import com.healthcare.telemedicine.feign.dto.UpdateAppointmentRequest;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;

@FeignClient(
        name = "appointment-service",
        url = "${services.appointment.url}",
        configuration = AppointmentFeignConfig.class)
public interface AppointmentClient {

    @GetMapping("/api/appointments/{id}")
    AppointmentSummary getAppointment(@PathVariable("id") String appointmentId);

    @PatchMapping("/api/appointments/{id}")
    AppointmentSummary updateAppointment(
            @PathVariable("id") String appointmentId,
            @RequestBody UpdateAppointmentRequest request
    );
}
