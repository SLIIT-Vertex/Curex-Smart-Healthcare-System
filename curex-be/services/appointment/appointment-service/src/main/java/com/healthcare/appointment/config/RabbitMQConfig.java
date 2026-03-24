package com.healthcare.appointment.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    // Exchange
    public static final String EXCHANGE = "healthcare.exchange";

    //  Routing keys (publishers)
    public static final String APPOINTMENT_BOOKED_KEY   = "appointment.booked";
    public static final String APPOINTMENT_CANCELLED_KEY = "appointment.cancelled";

    //  Queue names (what this service CONSUMES) 
    public static final String PAYMENT_CONFIRMED_QUEUE  = "payment.confirmed.queue";

    //  Exchange bean 
    @Bean
    public TopicExchange healthcareExchange() {
        return new TopicExchange(EXCHANGE, true, false);
    }

    //  Queues this service listens to 
    @Bean
    public Queue paymentConfirmedQueue() {
        return new Queue(PAYMENT_CONFIRMED_QUEUE, true);
    }

    @Bean
    public Binding paymentConfirmedBinding(Queue paymentConfirmedQueue,
                                           TopicExchange healthcareExchange) {
        return BindingBuilder.bind(paymentConfirmedQueue)
                .to(healthcareExchange)
                .with("payment.confirmed");
    }

    //  JSON message converter 
    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(jsonMessageConverter());
        return template;
    }
}
