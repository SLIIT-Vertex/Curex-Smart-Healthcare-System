package com.curex.payment.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@AllArgsConstructor
@Builder
public class PaymentConfirmationNotificationEvent {

    private final String paymentId;
    private final String appointmentId;
    private final String patientId;
    private final String amount;
    private final String currency;
    private final String status;
}
