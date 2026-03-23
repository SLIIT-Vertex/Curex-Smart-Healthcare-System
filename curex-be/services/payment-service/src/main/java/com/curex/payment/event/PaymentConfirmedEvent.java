package com.curex.payment.event;

import com.curex.payment.entity.PaymentStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Getter
@AllArgsConstructor
@Builder
public class PaymentConfirmedEvent {

    private final UUID paymentId;
    private final String appointmentId;
    private final String patientId;
    private final BigDecimal amount;
    private final String currency;
    private final PaymentStatus status;
    private final Instant timestamp;
}
