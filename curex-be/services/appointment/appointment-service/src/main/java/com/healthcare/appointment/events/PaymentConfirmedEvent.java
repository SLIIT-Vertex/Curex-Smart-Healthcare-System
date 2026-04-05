package com.healthcare.appointment.events;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

/** Consumed from Payment Service → confirms the appointment */
@JsonIgnoreProperties(ignoreUnknown = true)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PaymentConfirmedEvent implements Serializable {
    private String appointmentId;
    private String paymentId;
    private Double amount;
}
