package com.healthcare.appointment.events;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

/** Consumed from Payment Service → confirms the appointment */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PaymentConfirmedEvent implements Serializable {
    private String appointmentId;
    private String paymentId;
    private Double amount;
}
