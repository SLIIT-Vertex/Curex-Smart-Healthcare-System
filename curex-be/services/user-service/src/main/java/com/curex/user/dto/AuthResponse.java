package com.curex.user.dto;

import com.curex.user.entity.User;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {

    private String accessToken;
    private String refreshToken;
    private String tokenType = "Bearer";
    private Long expiresIn;
    private UserInfo user;

    public AuthResponse(String accessToken, String refreshToken, Long expiresIn, UserInfo user) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.expiresIn = expiresIn;
        this.user = user;
    }

    @Data
    @NoArgsConstructor
    public static class UserInfo {
        private String id;
        private String email;
        private String firstName;
        private String lastName;
        private String phoneNumber;
        private User.Role role;
        private User.AccountStatus accountStatus;
        private Boolean emailVerified;
        private LocalDateTime createdAt;

        public UserInfo(User user) {
            this.id = user.getId();
            this.email = user.getEmail();
            this.firstName = user.getFirstName();
            this.lastName = user.getLastName();
            this.phoneNumber = user.getPhoneNumber();
            this.role = user.getRole();
            this.accountStatus = user.getAccountStatus();
            this.emailVerified = user.getEmailVerified();
            this.createdAt = user.getCreatedAt();
        }
    }
}
