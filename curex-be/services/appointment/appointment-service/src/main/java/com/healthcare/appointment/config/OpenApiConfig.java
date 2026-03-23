package com.healthcare.appointment.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI appointmentServiceOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Appointment Service API")
                        .description("Curex Healthcare – Appointment & Telemedicine Service")
                        .version("1.0.0")
                        .contact(new Contact()
                                .name("Curex Team – M4")
                                .email("curex@healthcare.lk")));
    }
}
