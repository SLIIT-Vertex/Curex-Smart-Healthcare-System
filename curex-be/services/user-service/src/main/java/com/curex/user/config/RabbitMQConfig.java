package com.curex.user.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    public static final String USER_EXCHANGE       = "user.exchange";
    public static final String REGISTRATION_QUEUE  = "user.registration.queue";
    public static final String REGISTRATION_KEY    = "user.registration";
    public static final String STATUS_QUEUE        = "user.status.queue";
    public static final String STATUS_KEY          = "user.status.*";
    public static final String OTP_QUEUE           = "user.otp.queue";
    public static final String OTP_KEY             = "user.otp.send";

    @Bean
    public TopicExchange userExchange() {
        return new TopicExchange(USER_EXCHANGE);
    }

    @Bean
    public Queue registrationQueue() {
        return new Queue(REGISTRATION_QUEUE, true);
    }

    @Bean
    public Queue statusQueue() {
        return new Queue(STATUS_QUEUE, true);
    }

    @Bean
    public Queue otpQueue() {
        return new Queue(OTP_QUEUE, true);
    }

    @Bean
    public Binding registrationBinding(Queue registrationQueue, TopicExchange userExchange) {
        return BindingBuilder.bind(registrationQueue).to(userExchange).with(REGISTRATION_KEY);
    }

    @Bean
    public Binding statusBinding(Queue statusQueue, TopicExchange userExchange) {
        return BindingBuilder.bind(statusQueue).to(userExchange).with(STATUS_KEY);
    }

    @Bean
    public Binding otpBinding(Queue otpQueue, TopicExchange userExchange) {
        return BindingBuilder.bind(otpQueue).to(userExchange).with(OTP_KEY);
    }

    @Bean
    public Jackson2JsonMessageConverter messageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(messageConverter());
        return template;
    }
}
