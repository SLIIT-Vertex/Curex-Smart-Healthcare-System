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
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.HEALTHCARE_EXCHANGE,
                RabbitMQConfig.PAYMENT_CONFIRMED_ROUTING_KEY,
                event);
    }
}
