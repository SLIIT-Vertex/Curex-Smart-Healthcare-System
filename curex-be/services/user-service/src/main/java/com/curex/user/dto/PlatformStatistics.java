package com.curex.user.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
public class PlatformStatistics {

    private UserStatistics userStats;
    private List<RegistrationStatistic> registrationTrends;
    private SystemHealth systemHealth;

    @Data
    @NoArgsConstructor
    public static class UserStatistics {
        private Long totalPatients;
        private Long totalDoctors;
        private Long totalAdmins;
        private Long pendingDoctors;
        private Long approvedDoctors;
        private Long rejectedDoctors;
        private Long totalUsers;

        public UserStatistics(Map<String, Object> queryResult) {
            this.totalPatients = ((Number) queryResult.get("total_patients")).longValue();
            this.totalDoctors = ((Number) queryResult.get("total_doctors")).longValue();
            this.totalAdmins = ((Number) queryResult.get("total_admins")).longValue();
            this.pendingDoctors = ((Number) queryResult.get("pending_doctors")).longValue();
            this.approvedDoctors = ((Number) queryResult.get("approved_doctors")).longValue();
            this.rejectedDoctors = ((Number) queryResult.get("rejected_doctors")).longValue();
            this.totalUsers = this.totalPatients + this.totalDoctors + this.totalAdmins;
        }
    }

    @Data
    @NoArgsConstructor
    public static class RegistrationStatistic {
        private String date;
        private Long registrations;

        public RegistrationStatistic(Map<String, Object> queryResult) {
            this.date = queryResult.get("date").toString();
            this.registrations = ((Number) queryResult.get("registrations")).longValue();
        }
    }

    @Data
    @NoArgsConstructor
    public static class SystemHealth {
        private String status;
        private String databaseStatus;
        private String messagingStatus;
        private long uptime;
    }
}
