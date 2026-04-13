package com.curex.user.dto;

import lombok.Data;

@Data
public class NotificationPreferencesRequest {
    private Boolean appointmentReminders;
    private Boolean prescriptionAlerts;
    private Boolean paymentAlerts;
    private Boolean emailDigest;
}