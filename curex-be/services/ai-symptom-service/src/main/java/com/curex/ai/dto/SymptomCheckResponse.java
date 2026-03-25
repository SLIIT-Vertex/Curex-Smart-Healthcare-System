package com.curex.ai.dto;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SymptomCheckResponse {
    private List<String> conditions;
    private String specialty;
    private String urgency;  // "low" | "medium" | "high"
    /** 1–2 sentence lay summary of the analysis. */
    private String summary;
    /** Brief possible causes (optional). */
    private List<String> possibleCauses;
    /** What to do at home (optional). */
    private List<String> selfCareTips;
    /** When to see a doctor. */
    private String whenToSeekCare;
    /** When to seek emergency care; null if not urgent. */
    private String emergencyWarning;
}
