package com.curex.user.dto;

import com.curex.user.entity.User;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
public class UserResponse {

    private String id;
    private String email;
    private String firstName;
    private String lastName;
    private String phoneNumber;
    private User.Role role;
    private User.AccountStatus accountStatus;
    private Boolean emailVerified;
    private String approvedBy;
    private String approvalNotes;
    private LocalDateTime approvalDate;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public UserResponse(User user) {
        this.id = user.getId();
        this.email = user.getEmail();
        this.firstName = user.getFirstName();
        this.lastName = user.getLastName();
        this.phoneNumber = user.getPhoneNumber();
        this.role = user.getRole();
        this.accountStatus = user.getAccountStatus();
        this.emailVerified = user.getEmailVerified();
        this.approvedBy = user.getApprovedBy();
        this.approvalNotes = user.getApprovalNotes();
        this.approvalDate = user.getApprovalDate();
        this.createdAt = user.getCreatedAt();
        this.updatedAt = user.getUpdatedAt();
    }
}
