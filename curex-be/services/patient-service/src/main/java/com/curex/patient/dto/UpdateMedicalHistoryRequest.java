package com.curex.patient.dto;

import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateMedicalHistoryRequest {

    @NotNull(message = "Conditions list is required")
    private List<String> conditions;

    @NotNull(message = "Allergies list is required")
    private List<String> allergies;

    @NotNull(message = "Past surgeries list is required")
    private List<String> pastSurgeries;
}
