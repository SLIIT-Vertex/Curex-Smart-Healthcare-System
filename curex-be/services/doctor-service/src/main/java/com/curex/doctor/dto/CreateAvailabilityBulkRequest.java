package com.curex.doctor.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import lombok.*;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateAvailabilityBulkRequest {

    @Valid
    @NotEmpty(message = "At least one slot is required")
    private List<CreateAvailabilityRequest> slots;
}
