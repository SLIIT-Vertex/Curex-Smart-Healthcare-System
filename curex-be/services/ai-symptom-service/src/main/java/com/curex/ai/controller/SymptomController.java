package com.curex.ai.controller;

import com.curex.ai.config.AiConfig;
import com.curex.ai.dto.SymptomCheckRequest;
import com.curex.ai.dto.SymptomCheckResponse;
import com.curex.ai.service.FallbackService;
import com.curex.ai.service.GroqAiService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class SymptomController {

    private final AiConfig aiConfig;
    private final GroqAiService groqAiService;
    private final FallbackService fallbackService;

    @PostMapping("/symptoms/check")
    public ResponseEntity<SymptomCheckResponse> checkSymptoms(
            @Valid @RequestBody SymptomCheckRequest request) {

        log.info("Symptom check requested [provider={}, symptoms_length={}]",
            aiConfig.getProvider(), request.getSymptoms().length());

        SymptomCheckResponse response;

        if (aiConfig.getApiKey() == null || aiConfig.getApiKey().isBlank()) {
            log.warn("No API key configured — using rule-based fallback");
            response = fallbackService.analyzeSymptoms(request.getSymptoms());
        } else {
            try {
                response = groqAiService.analyzeSymptoms(request.getSymptoms());
            } catch (Exception e) {
                log.error("Groq API call failed, falling back to rules: {}", e.getMessage());
                response = fallbackService.analyzeSymptoms(request.getSymptoms());
            }
        }

        return ResponseEntity.ok(response);
    }

    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("AI Symptom Service is running");
    }
}
