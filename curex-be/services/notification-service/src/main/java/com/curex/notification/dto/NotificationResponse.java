package com.curex.notification.dto;

import com.curex.notification.entity.Notification;
import java.time.LocalDateTime;

public class NotificationResponse {

    private String id;
    private String userId;
    private String recipientEmail;
    private String recipientPhone;
    private Notification.NotificationType type;
    private Notification.NotificationChannel channel;
    private String subject;
    private String content;
    private String templateName;
    private Notification.NotificationStatus status;
    private LocalDateTime sentAt;
    private Integer deliveryAttempts;
    private String errorMessage;
    private String externalId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Default constructor
    public NotificationResponse() {}

    // Constructor from Notification entity
    public NotificationResponse(Notification notification) {
        this.id = notification.getId();
        this.userId = notification.getUserId();
        this.recipientEmail = notification.getRecipientEmail();
        this.recipientPhone = notification.getRecipientPhone();
        this.type = notification.getType();
        this.channel = notification.getChannel();
        this.subject = notification.getSubject();
        this.content = notification.getContent();
        this.templateName = notification.getTemplateName();
        this.status = notification.getStatus();
        this.sentAt = notification.getSentAt();
        this.deliveryAttempts = notification.getDeliveryAttempts();
        this.errorMessage = notification.getErrorMessage();
        this.externalId = notification.getExternalId();
        this.createdAt = notification.getCreatedAt();
        this.updatedAt = notification.getUpdatedAt();
    }

    // Getters and Setters
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getRecipientEmail() {
        return recipientEmail;
    }

    public void setRecipientEmail(String recipientEmail) {
        this.recipientEmail = recipientEmail;
    }

    public String getRecipientPhone() {
        return recipientPhone;
    }

    public void setRecipientPhone(String recipientPhone) {
        this.recipientPhone = recipientPhone;
    }

    public Notification.NotificationType getType() {
        return type;
    }

    public void setType(Notification.NotificationType type) {
        this.type = type;
    }

    public Notification.NotificationChannel getChannel() {
        return channel;
    }

    public void setChannel(Notification.NotificationChannel channel) {
        this.channel = channel;
    }

    public String getSubject() {
        return subject;
    }

    public void setSubject(String subject) {
        this.subject = subject;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public String getTemplateName() {
        return templateName;
    }

    public void setTemplateName(String templateName) {
        this.templateName = templateName;
    }

    public Notification.NotificationStatus getStatus() {
        return status;
    }

    public void setStatus(Notification.NotificationStatus status) {
        this.status = status;
    }

    public LocalDateTime getSentAt() {
        return sentAt;
    }

    public void setSentAt(LocalDateTime sentAt) {
        this.sentAt = sentAt;
    }

    public Integer getDeliveryAttempts() {
        return deliveryAttempts;
    }

    public void setDeliveryAttempts(Integer deliveryAttempts) {
        this.deliveryAttempts = deliveryAttempts;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    public void setErrorMessage(String errorMessage) {
        this.errorMessage = errorMessage;
    }

    public String getExternalId() {
        return externalId;
    }

    public void setExternalId(String externalId) {
        this.externalId = externalId;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}