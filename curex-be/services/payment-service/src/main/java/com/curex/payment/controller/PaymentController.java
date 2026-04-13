package com.curex.payment.controller;

import com.curex.payment.dto.ApiMessageResponse;
import com.curex.payment.dto.ApiResponse;
import com.curex.payment.dto.CreatePaymentRequest;
import com.curex.payment.dto.PaymentResponse;
import com.curex.payment.dto.StripeCheckoutResponse;
import com.curex.payment.exception.AuthorizationException;
import com.curex.payment.service.PaymentService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.util.StreamUtils;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Validated
public class PaymentController {

    private final PaymentService paymentService;

    @PostMapping("/payments/appointments/{appointmentId}")
    public ResponseEntity<ApiResponse<StripeCheckoutResponse>> createCheckout(
            @PathVariable @NotBlank String appointmentId,
            @Valid @RequestBody CreatePaymentRequest request) {
        StripeCheckoutResponse payload = paymentService.createPaymentForAppointment(appointmentId, request);
        return ResponseEntity.ok(ApiResponse.of("Checkout session created", payload));
    }

    @GetMapping("/payments/{id}")
    public ResponseEntity<ApiResponse<PaymentResponse>> getPayment(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.of("Payment details", paymentService.getPayment(id)));
    }

    @GetMapping("/payments/patients/{patientId}")
    public ResponseEntity<ApiResponse<List<PaymentResponse>>> listPayments(
            @PathVariable @NotBlank String patientId,
            @RequestHeader(name = "X-User-Id", required = false) String userId,
            @RequestHeader(name = "X-User-Role", required = false) String userRole) {
        requirePatientOrAdmin(patientId, userId, userRole);
        return ResponseEntity.ok(ApiResponse.of("Patient payments", paymentService.getPaymentsForPatient(patientId)));
    }

    @GetMapping("/payments/admin")
    public ResponseEntity<ApiResponse<List<PaymentResponse>>> listAdminPayments(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String patientId,
            @RequestParam(required = false) String appointmentId,
            @RequestHeader(name = "X-User-Role", required = false) String userRole) {
        requireAdmin(userRole);
        List<PaymentResponse> payload = paymentService.getAdminPayments(status, patientId, appointmentId);
        return ResponseEntity.ok(ApiResponse.of("Admin payments", payload));
    }

    /**
     * Stripe webhook endpoint.
     *
     * Tricky area: we must verify the signature using the RAW request body.
     * Do NOT parse into JSON first.
     */
    @PostMapping(value = "/payments/webhook", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ApiMessageResponse> webhook(
            HttpServletRequest request,
            @RequestHeader(name = "Stripe-Signature", required = false) String stripeSignature) throws IOException {
        byte[] requestBytes = StreamUtils.copyToByteArray(request.getInputStream());
        String payload = new String(requestBytes, StandardCharsets.UTF_8);

        paymentService.handleStripeWebhook(payload, stripeSignature);
        return ResponseEntity.ok(ApiMessageResponse.of("Webhook received"));
    }

    private void requireAdmin(String userRole) {
        if (!"ADMIN".equalsIgnoreCase(userRole)) {
            throw new AuthorizationException("Admin access required");
        }
    }

    private void requirePatientOrAdmin(String patientId, String userId, String userRole) {
        if ("ADMIN".equalsIgnoreCase(userRole)) {
            return;
        }
        if (!StringUtils.hasText(userId)) {
            throw new AuthorizationException("Missing authenticated user id");
        }
        if (!patientId.trim().equals(userId.trim())) {
            throw new AuthorizationException("Cannot access another patient's payments");
        }
    }
}
