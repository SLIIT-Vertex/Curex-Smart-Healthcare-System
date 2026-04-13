package com.curex.doctor.feign.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Subset of user-service {@code UserResponse} for Feign deserialization.
 */
@Data
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class ApprovedUserFeignDto {

    private String id;
}
