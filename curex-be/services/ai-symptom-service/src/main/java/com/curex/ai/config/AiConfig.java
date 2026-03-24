package com.curex.ai.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;
import lombok.Data;

@Data
@Configuration
@ConfigurationProperties(prefix = "ai")
public class AiConfig {
    private String provider;
    private String apiKey;
    private String baseUrl;
    private String model;
    private int maxTokens;
    private double temperature;

    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }
}
