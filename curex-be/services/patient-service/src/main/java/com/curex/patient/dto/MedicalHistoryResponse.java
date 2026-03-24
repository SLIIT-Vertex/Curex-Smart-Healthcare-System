package com.curex.patient.dto;

import lombok.*;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MedicalHistoryResponse {

    private String id;
    private List<String> conditions;
    private List<String> allergies;
    private List<String> pastSurgeries;
}
