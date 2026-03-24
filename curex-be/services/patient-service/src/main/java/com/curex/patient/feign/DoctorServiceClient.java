package com.curex.patient.feign;

import com.curex.patient.feign.dto.PrescriptionResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.List;

@FeignClient(name = "doctor-service", url = "${services.doctor.url:http://localhost:8084}")
public interface DoctorServiceClient {

    @GetMapping("/prescriptions/patient/{patientId}")
    List<PrescriptionResponse> getPrescriptionsByPatient(@PathVariable("patientId") String patientId);
}
