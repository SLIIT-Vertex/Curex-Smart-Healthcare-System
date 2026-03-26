package com.curex.payment.service;

import com.curex.payment.dto.CreatePaymentRequest;
import com.curex.payment.dto.PaymentResponse;
import com.curex.payment.dto.StripeCheckoutResponse;

import java.util.List;
import java.util.UUID;

public interface PaymentService {

    StripeCheckoutResponse createPaymentForAppointment(String appointmentId, CreatePaymentRequest request);

    PaymentResponse getPayment(UUID id);

    /**
     * Marks a payment as SUCCESS and publishes payment.confirmed event.
     * Useful for manual/integration testing without Stripe webhooks.
     */
    PaymentResponse confirmPayment(UUID paymentId);

    List<PaymentResponse> getPaymentsForPatient(String patientId);

    long purgeUserData(String userId);

    /**
     * Handle Stripe webhook (signature verified before processing).
     */
    void handleStripeWebhook(String payload, String signatureHeader);
}
