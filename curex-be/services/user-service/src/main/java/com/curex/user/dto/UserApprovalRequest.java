package com.curex.user.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserApprovalRequest {

    @NotNull(message = "Action is required")
    private ApprovalAction action;

    private String notes;

    public enum ApprovalAction {
        APPROVE,
        REJECT,
        SUSPEND,
        REACTIVATE
    }
}
