package com.curex.doctor.feign;

import com.curex.doctor.feign.dto.AppointmentResponseDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "appointment-service", url = "${services.appointment.url:http://localhost:8088}")
public interface AppointmentClient {

    @GetMapping("/api/appointments/{id}")
    AppointmentResponseDto getAppointmentById(@PathVariable("id") String id);
}
