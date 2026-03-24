package com.curex.patient.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmergencyContactResponse {

    private String id;
    private String name;
    private String relationship;
    private String phone;
}
