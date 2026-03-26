package com.curex.payment.event;

import com.curex.payment.config.RabbitMQConfig;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

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
        // Existing route used by appointment-service.
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.HEALTHCARE_EXCHANGE,
                RabbitMQConfig.PAYMENT_CONFIRMED_ROUTING_KEY,
                event);

        rabbitTemplate.convertAndSend(
            RabbitMQConfig.NOTIFICATION_PAYMENT_EXCHANGE,
            RabbitMQConfig.NOTIFICATION_PAYMENT_CONFIRMATION_ROUTING_KEY,
                toPaymentConfirmationNotificationEvent(event));
    }

    private PaymentConfirmationNotificationEvent toPaymentConfirmationNotificationEvent(PaymentConfirmedEvent event) {
        return PaymentConfirmationNotificationEvent.builder()
                .paymentId(event.getPaymentId() != null ? event.getPaymentId().toString() : null)
                .appointmentId(event.getAppointmentId())
                .patientId(event.getPatientId())
                .amount(event.getAmount() != null ? event.getAmount().toPlainString() : null)
                .currency(event.getCurrency())
                .status(event.getStatus() != null ? event.getStatus().name() : null)
                .build();
    }
}
