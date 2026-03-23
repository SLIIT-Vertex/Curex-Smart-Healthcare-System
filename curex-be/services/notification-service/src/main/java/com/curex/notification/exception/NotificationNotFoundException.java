package com.curex.notification.exception;

import org.springframework.http.HttpStatus;

public class NotificationNotFoundException extends CurexNotificationException {

    public NotificationNotFoundException(String id) {
        super("Notification not found with id: " + id, HttpStatus.NOT_FOUND);
    }
}
