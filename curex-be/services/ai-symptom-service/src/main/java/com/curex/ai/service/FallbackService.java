package com.curex.ai.service;

import com.curex.ai.dto.SymptomCheckResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
public class FallbackService {

    public SymptomCheckResponse analyzeSymptoms(String symptoms) {
        log.info("Using rule-based fallback for symptom analysis");
        String lower = symptoms.toLowerCase();

        if (containsAny(lower, "headache", "dizziness", "migraine", "head pain")) {
            return SymptomCheckResponse.builder()
                .conditions(List.of("Tension headache", "Migraine", "Vertigo (BPPV)"))
                .specialty("Neurologist")
                .urgency("medium")
                .build();
        }

        if (containsAny(lower, "chest", "heart", "palpitation", "chest pain")) {
            return SymptomCheckResponse.builder()
                .conditions(List.of("Angina", "GERD (Acid reflux)", "Musculoskeletal strain"))
                .specialty("Cardiologist")
                .urgency("high")
                .build();
        }

        if (containsAny(lower, "fever", "cough", "cold", "sore throat", "flu")) {
            return SymptomCheckResponse.builder()
                .conditions(List.of("Common cold", "Influenza", "Upper respiratory infection"))
                .specialty("General Practitioner")
                .urgency("low")
                .build();
        }

        if (containsAny(lower, "stomach", "nausea", "vomit", "diarrhea", "abdominal")) {
            return SymptomCheckResponse.builder()
                .conditions(List.of("Gastritis", "Food poisoning", "Irritable bowel syndrome"))
                .specialty("Gastroenterologist")
                .urgency("medium")
                .build();
        }

        if (containsAny(lower, "skin", "rash", "itch", "allergy", "hives")) {
            return SymptomCheckResponse.builder()
                .conditions(List.of("Contact dermatitis", "Eczema", "Allergic reaction"))
                .specialty("Dermatologist")
                .urgency("low")
                .build();
        }

        if (containsAny(lower, "back pain", "joint", "knee", "muscle", "sprain")) {
            return SymptomCheckResponse.builder()
                .conditions(List.of("Muscle strain", "Herniated disc", "Osteoarthritis"))
                .specialty("Orthopedic Surgeon")
                .urgency("medium")
                .build();
        }

        if (containsAny(lower, "anxiety", "depression", "stress", "insomnia", "panic")) {
            return SymptomCheckResponse.builder()
                .conditions(List.of("Generalized anxiety disorder", "Depression", "Insomnia"))
                .specialty("Psychiatrist")
                .urgency("medium")
                .build();
        }

        return SymptomCheckResponse.builder()
            .conditions(List.of("General consultation recommended"))
            .specialty("General Practitioner")
            .urgency("low")
            .build();
    }

    private boolean containsAny(String text, String... keywords) {
        for (String keyword : keywords) {
            if (text.contains(keyword)) return true;
        }
        return false;
    }
}
