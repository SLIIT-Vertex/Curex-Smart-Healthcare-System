package com.curex.payment.dto;

import com.curex.payment.entity.PaymentStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.util.UUID;

@Getter
@AllArgsConstructor
@Builder
public class StripeCheckoutResponse {

    private final UUID paymentId;
    private final String appointmentId;
    private final String patientId;
    private final BigDecimal amount;
    private final String currency;
    private final PaymentStatus status;

    private final String stripeSessionId;
    private final String checkoutUrl;
}
