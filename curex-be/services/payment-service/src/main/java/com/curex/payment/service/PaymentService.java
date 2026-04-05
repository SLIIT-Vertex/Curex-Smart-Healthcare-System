package com.curex.payment.service;

import com.curex.payment.dto.CreatePaymentRequest;
import com.curex.payment.dto.PaymentResponse;
import com.curex.payment.dto.StripeCheckoutResponse;

import java.util.List;
import java.util.UUID;

public interface PaymentService {

    StripeCheckoutResponse createPaymentForAppointment(String appointmentId, CreatePaymentRequest request);

    PaymentResponse getPayment(UUID id);

    List<PaymentResponse> getPaymentsForPatient(String patientId);

    List<PaymentResponse> getAdminPayments(String status, String patientId, String appointmentId);

    long purgeUserData(String userId);

    /**
     * Handle Stripe webhook (signature verified before processing).
     */
    void handleStripeWebhook(String payload, String signatureHeader);
}
