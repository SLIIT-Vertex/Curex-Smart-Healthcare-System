package com.curex.ai;

import com.curex.ai.config.AiConfig;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties(AiConfig.class)
public class AiSymptomServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(AiSymptomServiceApplication.class, args);
    }
}
