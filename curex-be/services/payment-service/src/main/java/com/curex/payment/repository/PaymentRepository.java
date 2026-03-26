package com.curex.payment.repository;

import com.curex.payment.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PaymentRepository extends JpaRepository<Payment, UUID> {

    List<Payment> findByPatientIdOrderByCreatedAtDesc(String patientId);

    Optional<Payment> findByStripeSessionId(String stripeSessionId);

    long deleteByPatientId(String patientId);
}
