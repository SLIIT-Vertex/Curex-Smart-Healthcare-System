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
    public static final String USER_STATUS_CHANGED_QUEUE = "user.status.queue";
    public static final String APPOINTMENT_BOOKING_QUEUE = "appointment.booking.queue";
    public static final String PAYMENT_CONFIRMATION_QUEUE = "payment.confirmation.queue";
    public static final String PRESCRIPTION_ISSUED_QUEUE = "prescription.issued.queue";

    // Routing keys
    public static final String USER_REGISTRATION_ROUTING_KEY = "user.registration";
    public static final String USER_STATUS_ROUTING_KEY = "user.status.*";
    public static final String APPOINTMENT_BOOKING_ROUTING_KEY = "appointment.booking";
    public static final String PAYMENT_CONFIRMATION_ROUTING_KEY = "payment.confirmation";
    public static final String PRESCRIPTION_ISSUED_ROUTING_KEY = "prescription.issued";

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

    @Bean
    public Queue userStatusChangedQueue() {
        return QueueBuilder.durable(USER_STATUS_CHANGED_QUEUE).build();
    }

    @Bean
    public Binding userStatusChangedBinding() {
        return BindingBuilder
                .bind(userStatusChangedQueue())
                .to(userExchange())
                .with(USER_STATUS_ROUTING_KEY);
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

    // === PRESCRIPTION EVENTS (from doctor-service) ===
    @Bean
    public Queue prescriptionIssuedQueue() {
        return QueueBuilder.durable(PRESCRIPTION_ISSUED_QUEUE).build();
    }

    @Bean
    public Binding prescriptionIssuedBinding() {
        return BindingBuilder
                .bind(prescriptionIssuedQueue())
                .to(doctorExchange())
                .with(PRESCRIPTION_ISSUED_ROUTING_KEY);
    }

    // === OTP EVENTS (from user-service) ===
    public static final String OTP_QUEUE = "user.otp.queue";
    public static final String OTP_ROUTING_KEY = "user.otp.send";

    @Bean
    public Queue otpQueue() {
        return QueueBuilder.durable(OTP_QUEUE).build();
    }

    @Bean
    public Binding otpBinding() {
        return BindingBuilder
                .bind(otpQueue())
                .to(userExchange())
                .with(OTP_ROUTING_KEY);
    }
}