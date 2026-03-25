package com.curex.doctor;

import com.curex.doctor.feign.AppointmentClient;
import com.curex.doctor.feign.UserServiceClient;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class DoctorServiceApplicationTests {

    @MockBean
    private RabbitTemplate rabbitTemplate;

    @MockBean
    private AppointmentClient appointmentClient;

    @MockBean
    private UserServiceClient userServiceClient;

    @Test
    void contextLoads() {
    }
}
