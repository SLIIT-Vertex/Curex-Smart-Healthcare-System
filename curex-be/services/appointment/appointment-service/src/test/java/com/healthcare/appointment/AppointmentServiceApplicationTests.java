package com.healthcare.appointment;

import org.junit.jupiter.api.Test;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.TestPropertySource;

@SpringBootTest
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:testdb;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "appointment.stub-mode=true",
        "spring.rabbitmq.listener.simple.auto-startup=false",
})
class AppointmentServiceApplicationTests {

    /** Satisfies {@code RabbitMQConfig#rabbitTemplate(ConnectionFactory)} without a real broker. */
    @MockBean
    private ConnectionFactory connectionFactory;

    @Test
    void contextLoads() {
        // Verifies the Spring context starts correctly
    }
}
