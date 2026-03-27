package com.curex.payment.controller;

import com.curex.payment.service.PaymentService;
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

    private final PaymentService paymentService;

    @DeleteMapping("/{userId}/purge")
    public ResponseEntity<Map<String, Long>> purgeUserData(@PathVariable String userId) {
        long deletedPayments = paymentService.purgeUserData(userId);
        return ResponseEntity.ok(Map.of(
                "deletedPayments", deletedPayments,
                "totalDeleted", deletedPayments
        ));
    }
}
