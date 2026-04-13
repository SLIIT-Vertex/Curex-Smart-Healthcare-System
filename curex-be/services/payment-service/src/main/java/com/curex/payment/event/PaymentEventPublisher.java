package com.curex.payment.event;

import com.curex.payment.config.RabbitMQConfig;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class PaymentEventPublisher {

    private final RabbitTemplate rabbitTemplate;

    /**
     * Publishes the payment confirmed event to RabbitMQ.
     *
     * Tricky area: we use JSON message converter (configured in RabbitMQConfig)
     * so other services can consume without Java serialization.
     */
    public void publishPaymentConfirmed(PaymentConfirmedEvent event) {
        Map<String, Object> payload = toPaymentConfirmedPayload(event);

        // Existing route used by appointment-service.
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.HEALTHCARE_EXCHANGE,
                RabbitMQConfig.PAYMENT_CONFIRMED_ROUTING_KEY,
                payload);

        rabbitTemplate.convertAndSend(
            RabbitMQConfig.NOTIFICATION_PAYMENT_EXCHANGE,
            RabbitMQConfig.NOTIFICATION_PAYMENT_CONFIRMATION_ROUTING_KEY,
                payload);
    }

    private Map<String, Object> toPaymentConfirmedPayload(PaymentConfirmedEvent event) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("paymentId", event.getPaymentId() != null ? event.getPaymentId().toString() : null);
        payload.put("appointmentId", event.getAppointmentId());
        payload.put("patientId", event.getPatientId());
        payload.put("amount", event.getAmount() != null ? event.getAmount().toPlainString() : null);
        payload.put("currency", event.getCurrency());
        payload.put("status", event.getStatus() != null ? event.getStatus().name() : null);
        payload.put("timestamp", event.getTimestamp() != null ? event.getTimestamp().toString() : null);
        return payload;
    }
}
