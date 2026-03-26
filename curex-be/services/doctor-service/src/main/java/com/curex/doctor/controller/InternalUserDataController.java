package com.curex.doctor.controller;

import com.curex.doctor.service.DoctorService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/internal/users")
@RequiredArgsConstructor
public class InternalUserDataController {

    private final DoctorService doctorService;

    @DeleteMapping("/{userId}/purge")
    public ResponseEntity<Map<String, Long>> purgeUserData(@PathVariable String userId) {
        return ResponseEntity.ok(doctorService.purgeUserData(userId));
    }
}
