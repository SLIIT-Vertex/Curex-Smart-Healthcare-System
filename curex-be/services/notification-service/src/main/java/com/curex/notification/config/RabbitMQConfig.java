package com.curex.notification.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.config.SimpleRabbitListenerContainerFactory;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    // Exchange names
    public static final String USER_EXCHANGE = "user.exchange";
    public static final String APPOINTMENT_EXCHANGE = "appointment.exchange";
    public static final String PAYMENT_EXCHANGE = "payment.exchange";
    public static final String DOCTOR_EXCHANGE = "doctor.exchange";

    // Queue names
    public static final String USER_REGISTRATION_QUEUE = "user.registration.queue";
    public static final String APPOINTMENT_BOOKING_QUEUE = "appointment.booking.queue";
    public static final String PAYMENT_CONFIRMATION_QUEUE = "payment.confirmation.queue";
    public static final String DOCTOR_APPROVAL_QUEUE = "doctor.approval.queue";

    // Routing keys
    public static final String USER_REGISTRATION_ROUTING_KEY = "user.registration";
    public static final String APPOINTMENT_BOOKING_ROUTING_KEY = "appointment.booking";
    public static final String PAYMENT_CONFIRMATION_ROUTING_KEY = "payment.confirmation";
    public static final String DOCTOR_APPROVAL_ROUTING_KEY = "doctor.approval";

    // Message converter for JSON
    @Bean
    public MessageConverter messageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    // RabbitTemplate configuration
    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(messageConverter());
        return template;
    }

    // Listener container factory
    @Bean
    public SimpleRabbitListenerContainerFactory rabbitListenerContainerFactory(ConnectionFactory connectionFactory) {
        SimpleRabbitListenerContainerFactory factory = new SimpleRabbitListenerContainerFactory();
        factory.setConnectionFactory(connectionFactory);
        factory.setMessageConverter(messageConverter());
        factory.setConcurrentConsumers(3);
        factory.setMaxConcurrentConsumers(10);
        return factory;
    }

    // === USER EVENTS ===
    @Bean
    public TopicExchange userExchange() {
        return new TopicExchange(USER_EXCHANGE, true, false);
    }

    @Bean
    public Queue userRegistrationQueue() {
        return QueueBuilder.durable(USER_REGISTRATION_QUEUE).build();
    }

    @Bean
    public Binding userRegistrationBinding() {
        return BindingBuilder
                .bind(userRegistrationQueue())
                .to(userExchange())
                .with(USER_REGISTRATION_ROUTING_KEY);
    }

    // === APPOINTMENT EVENTS ===
    @Bean
    public TopicExchange appointmentExchange() {
        return new TopicExchange(APPOINTMENT_EXCHANGE, true, false);
    }

    @Bean
    public Queue appointmentBookingQueue() {
        return QueueBuilder.durable(APPOINTMENT_BOOKING_QUEUE).build();
    }

    @Bean
    public Binding appointmentBookingBinding() {
        return BindingBuilder
                .bind(appointmentBookingQueue())
                .to(appointmentExchange())
                .with(APPOINTMENT_BOOKING_ROUTING_KEY);
    }

    // === PAYMENT EVENTS ===
    @Bean
    public TopicExchange paymentExchange() {
        return new TopicExchange(PAYMENT_EXCHANGE, true, false);
    }

    @Bean
    public Queue paymentConfirmationQueue() {
        return QueueBuilder.durable(PAYMENT_CONFIRMATION_QUEUE).build();
    }

    @Bean
    public Binding paymentConfirmationBinding() {
        return BindingBuilder
                .bind(paymentConfirmationQueue())
                .to(paymentExchange())
                .with(PAYMENT_CONFIRMATION_ROUTING_KEY);
    }

    // === DOCTOR EVENTS ===
    @Bean
    public TopicExchange doctorExchange() {
        return new TopicExchange(DOCTOR_EXCHANGE, true, false);
    }

    @Bean
    public Queue doctorApprovalQueue() {
        return QueueBuilder.durable(DOCTOR_APPROVAL_QUEUE).build();
    }

    @Bean
    public Binding doctorApprovalBinding() {
        return BindingBuilder
                .bind(doctorApprovalQueue())
                .to(doctorExchange())
                .with(DOCTOR_APPROVAL_ROUTING_KEY);
    }
}