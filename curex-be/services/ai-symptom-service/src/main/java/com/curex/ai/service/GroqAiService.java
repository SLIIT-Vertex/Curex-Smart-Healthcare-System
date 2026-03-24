package com.curex.ai.service;

import com.curex.ai.config.AiConfig;
import com.curex.ai.dto.SymptomCheckResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class GroqAiService {

    private final AiConfig aiConfig;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    private static final String SYSTEM_PROMPT = """
        You are a medical triage assistant for a healthcare platform.
        Given the patient's symptoms, you must suggest:
        1. Exactly three possible medical conditions (most likely first)
        2. The single most appropriate doctor specialty to consult
        3. An urgency level: "low", "medium", or "high"

        Respond ONLY with a valid JSON object in this exact format, no extra text:
        {"conditions":["condition1","condition2","condition3"],"specialty":"SpecialtyName","urgency":"low|medium|high"}
        """;

    public SymptomCheckResponse analyzeSymptoms(String symptoms) {
        String url = aiConfig.getBaseUrl() + "/chat/completions";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(aiConfig.getApiKey());

        String userMessage = "Patient symptoms: " + symptoms;

        Map<String, Object> requestBody = Map.of(
            "model", aiConfig.getModel(),
            "messages", List.of(
                Map.of("role", "system", "content", SYSTEM_PROMPT),
                Map.of("role", "user", "content", userMessage)
            ),
            "temperature", aiConfig.getTemperature(),
            "max_tokens", aiConfig.getMaxTokens()
        );

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        log.info("Sending symptom analysis request to Groq [model={}]", aiConfig.getModel());

        ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);

        return parseGroqResponse(response.getBody());
    }

    private SymptomCheckResponse parseGroqResponse(String responseBody) {
        try {
            JsonNode root = objectMapper.readTree(responseBody);
            String content = root
                .path("choices").get(0)
                .path("message")
                .path("content")
                .asText();

            // Strip markdown code fences if present
            content = content.strip();
            if (content.startsWith("```json")) {
                content = content.substring(7);
            } else if (content.startsWith("```")) {
                content = content.substring(3);
            }
            if (content.endsWith("```")) {
                content = content.substring(0, content.length() - 3);
            }
            content = content.strip();

            JsonNode parsed = objectMapper.readTree(content);

            List<String> conditions = new ArrayList<>();
            if (parsed.has("conditions") && parsed.get("conditions").isArray()) {
                parsed.get("conditions").forEach(c -> conditions.add(c.asText()));
            }

            return SymptomCheckResponse.builder()
                .conditions(conditions)
                .specialty(parsed.path("specialty").asText("General Practitioner"))
                .urgency(parsed.path("urgency").asText("low"))
                .build();

        } catch (Exception e) {
            log.error("Failed to parse Groq response: {}", e.getMessage());
            throw new RuntimeException("Failed to parse AI response", e);
        }
    }
}
