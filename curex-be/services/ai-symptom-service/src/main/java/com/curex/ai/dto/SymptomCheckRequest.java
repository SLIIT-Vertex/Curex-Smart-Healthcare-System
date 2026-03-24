package com.curex.ai.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class SymptomCheckRequest {
    @NotBlank(message = "Symptoms description is required")
    @Size(min = 3, max = 2000, message = "Symptoms must be between 3 and 2000 characters")
    private String symptoms;
}
