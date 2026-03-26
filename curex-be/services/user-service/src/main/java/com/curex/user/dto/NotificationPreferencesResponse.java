package com.curex.user.dto;

import com.curex.user.entity.User;
import lombok.Getter;

@Getter
public class NotificationPreferencesResponse {
    private final String userId;
    private final boolean appointmentReminders;
    private final boolean prescriptionAlerts;
    private final boolean paymentAlerts;
    private final boolean emailDigest;

    public NotificationPreferencesResponse(User user) {
        this.userId = user.getId();
        this.appointmentReminders = Boolean.TRUE.equals(user.getNotifyAppointmentReminders());
        this.prescriptionAlerts = Boolean.TRUE.equals(user.getNotifyPrescriptionAlerts());
        this.paymentAlerts = Boolean.TRUE.equals(user.getNotifyPaymentAlerts());
        this.emailDigest = Boolean.TRUE.equals(user.getNotifyEmailDigest());
    }
}