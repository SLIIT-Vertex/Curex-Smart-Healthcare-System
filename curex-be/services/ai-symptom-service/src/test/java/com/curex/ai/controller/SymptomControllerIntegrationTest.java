package com.curex.ai.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * MockMvc + Hamcrest APIs are not annotated consistently with {@code @NonNull}; Eclipse null analysis
 * otherwise reports spurious “unchecked conversion” on {@link MediaType} and matchers.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")  // Uses FallbackService (no GROQ_API_KEY required)
@SuppressWarnings("null")
class SymptomControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void checkSymptoms_withValidInput_returnsResponse() throws Exception {
        mockMvc.perform(post("/api/ai/symptoms/check")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"symptoms\": \"headache and dizziness for 3 days\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.conditions", hasSize(greaterThanOrEqualTo(1))))
                .andExpect(jsonPath("$.specialty", notNullValue()))
                .andExpect(jsonPath("$.urgency", anyOf(
                        equalTo("low"), equalTo("medium"), equalTo("high"))));
    }

    @Test
    void checkSymptoms_withHeadache_returnsExtendedFields() throws Exception {
        mockMvc.perform(post("/api/ai/symptoms/check")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"symptoms\": \"headache and dizziness\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.summary", notNullValue()))
                .andExpect(jsonPath("$.selfCareTips", hasSize(greaterThanOrEqualTo(1))))
                .andExpect(jsonPath("$.whenToSeekCare", notNullValue()));
    }

    @Test
    void checkSymptoms_withEmptySymptoms_returns400() throws Exception {
        mockMvc.perform(post("/api/ai/symptoms/check")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"symptoms\": \"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error", notNullValue()));
    }

    @Test
    void checkSymptoms_withTooShortSymptoms_returns400() throws Exception {
        mockMvc.perform(post("/api/ai/symptoms/check")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"symptoms\": \"ab\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void checkSymptoms_withSymptomsOver2000Chars_returns400() throws Exception {
        String tooLong = "a".repeat(2001);
        mockMvc.perform(post("/api/ai/symptoms/check")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"symptoms\": \"" + tooLong + "\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void checkSymptoms_withExactly2000Chars_returnsOk() throws Exception {
        String validLength = "a".repeat(2000);
        String json = "{\"symptoms\": \"" + validLength.replace("\\", "\\\\").replace("\"", "\\\"") + "\"}";
        mockMvc.perform(post("/api/ai/symptoms/check")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.conditions", notNullValue()))
                .andExpect(jsonPath("$.specialty", notNullValue()))
                .andExpect(jsonPath("$.urgency", notNullValue()));
    }

    @Test
    void health_returnsOk() throws Exception {
        mockMvc.perform(get("/api/ai/health"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("AI Symptom Service")));
    }
}
