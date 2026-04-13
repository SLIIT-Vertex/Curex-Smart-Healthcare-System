package com.curex.notification.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.curex.notification.dto.NotificationRequest;
import com.curex.notification.dto.NotificationResponse;
import com.curex.notification.entity.Notification;
import com.curex.notification.exception.NotificationNotFoundException;
import com.curex.notification.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.CompletableFuture;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final EmailService emailService;
    private final SmsService smsService;
    private final ObjectMapper objectMapper;

    @Async
    public CompletableFuture<Void> sendNotificationAsync(NotificationRequest request) {
        try {
            sendNotification(request);
        } catch (Exception e) {
            log.error("Async notification delivery failed: {}", e.getMessage());
        }
        return CompletableFuture.completedFuture(null);
    }

    @Transactional
    public NotificationResponse sendNotification(NotificationRequest request) {
        Notification notification = buildNotificationEntity(request);
        notification = notificationRepository.save(notification);

        boolean success = processNotification(notification);
        updateNotificationStatus(notification, success);

        return new NotificationResponse(notification);
    }

    @Transactional(readOnly = true)
    public Page<NotificationResponse> getUserNotifications(
            String userId,
            Notification.NotificationReadStatus readStatus,
            Notification.NotificationChannel channel,
            int page,
            int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Notification> notifications;

        if (readStatus == null && channel == null) {
            notifications = notificationRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
        } else if (readStatus == null) {
            notifications = notificationRepository.findByUserIdAndChannelOrderByCreatedAtDesc(
                    userId,
                    channel,
                    pageable);
        } else if (channel == null) {
            notifications = notificationRepository.findByUserIdAndReadStatusOrderByCreatedAtDesc(
                    userId,
                    readStatus,
                    pageable);
        } else {
            notifications = notificationRepository.findByUserIdAndReadStatusAndChannelOrderByCreatedAtDesc(
                    userId,
                    readStatus,
                    channel,
                    pageable);
        }

        return notifications
                .map(NotificationResponse::new);
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(String userId, Notification.NotificationChannel channel) {
        if (channel == null) {
            return notificationRepository.countByUserIdAndReadStatus(
                    userId,
                    Notification.NotificationReadStatus.UNREAD);
        }

        return notificationRepository.countByUserIdAndReadStatusAndChannel(
                userId,
                Notification.NotificationReadStatus.UNREAD,
                channel);
    }

    @Transactional
    public void markAsRead(String userId, String notificationId) {
        Notification notification = notificationRepository.findByIdAndUserId(notificationId, userId)
                .orElseThrow(() -> new NotificationNotFoundException(notificationId));

        if (notification.getReadStatus() == Notification.NotificationReadStatus.READ) {
            return;
        }

        notification.setReadStatus(Notification.NotificationReadStatus.READ);
        notification.setReadAt(LocalDateTime.now());
        notificationRepository.save(notification);
    }

    @Transactional
    public int markAllAsRead(String userId, Notification.NotificationChannel channel) {
        if (channel == null) {
            return notificationRepository.markAllAsRead(userId, LocalDateTime.now());
        }

        return notificationRepository.markAllAsReadByChannel(userId, channel, LocalDateTime.now());
    }

    @Transactional(readOnly = true)
    public NotificationResponse getNotificationById(String notificationId) {
        return notificationRepository.findById(notificationId)
                .map(NotificationResponse::new)
                .orElseThrow(() -> new NotificationNotFoundException(notificationId));
    }

    @Transactional
    public void retryFailedNotifications() {
        List<Notification> pending = notificationRepository.findNotificationsForRetry(LocalDateTime.now());
        log.info("Retrying {} failed notifications", pending.size());
        for (Notification notification : pending) {
            try {
                boolean success = processNotification(notification);
                updateNotificationStatus(notification, success);
            } catch (Exception e) {
                log.error("Retry failed for notification {}: {}", notification.getId(), e.getMessage());
            }
        }
    }

    @Transactional(readOnly = true)
    public Object[] getNotificationStatistics(LocalDateTime fromDate) {
        return notificationRepository.getNotificationStatistics(fromDate);
    }

    @Transactional(readOnly = true)
    public Page<NotificationResponse> getNotifications(
            String userId, Notification.NotificationType type,
            Notification.NotificationChannel channel, Notification.NotificationStatus status,
            int page, int size) {

        Pageable pageable = PageRequest.of(page, size);
        return notificationRepository.findNotifications(userId, type, channel, status, pageable)
                .map(NotificationResponse::new);
    }

    @Transactional
    public void cancelNotification(String notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new NotificationNotFoundException(notificationId));

        if (notification.getStatus() != Notification.NotificationStatus.PENDING) {
            throw new com.curex.notification.exception.CurexNotificationException(
                    "Cannot cancel notification in status: " + notification.getStatus(),
                    HttpStatus.CONFLICT);
        }

        notification.setStatus(Notification.NotificationStatus.CANCELLED);
        notificationRepository.save(notification);
        log.info("Cancelled notification {}", notificationId);
    }

    @Transactional
    public void cleanupOldNotifications(int daysOld) {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(daysOld);
        notificationRepository.deleteOldNotifications(cutoff);
        log.info("Cleaned up notifications older than {} days", daysOld);
    }

    @Transactional
    public long purgeUserData(String userId) {
        if (userId == null || userId.isBlank()) {
            return 0;
        }
        return notificationRepository.deleteByUserId(userId.trim());
    }

    //  private helpers 

    private boolean processNotification(Notification notification) {
        notification.setStatus(Notification.NotificationStatus.PROCESSING);
        notification.setDeliveryAttempts(notification.getDeliveryAttempts() + 1);
        notificationRepository.save(notification);

        return switch (notification.getChannel()) {
            case EMAIL -> sendEmailNotification(notification);
            case SMS -> sendSmsNotification(notification);
            case IN_APP -> true;
            case PUSH -> {
                log.warn("Push notifications are not implemented yet");
                yield false;
            }
        };
    }

    private boolean sendEmailNotification(Notification notification) {
        try {
            if (notification.getRecipientEmail() == null || notification.getRecipientEmail().isBlank()) {
                throw new IllegalArgumentException("Recipient email is required for email notifications");
            }
            return emailService.sendEmail(notification);
        } catch (Exception e) {
            log.error("Email sending failed for notification {}: {}", notification.getId(), e.getMessage());
            notification.setErrorMessage(e.getMessage());
            return false;
        }
    }

    private boolean sendSmsNotification(Notification notification) {
        try {
            if (notification.getRecipientPhone() == null || notification.getRecipientPhone().isBlank()) {
                throw new IllegalArgumentException("Recipient phone is required for SMS notifications");
            }
            if (!smsService.isAvailable()) {
                throw new IllegalStateException("SMS service is not available");
            }
            return smsService.sendSms(notification);
        } catch (Exception e) {
            log.error("SMS sending failed for notification {}: {}", notification.getId(), e.getMessage());
            notification.setErrorMessage(e.getMessage());
            return false;
        }
    }

    private void updateNotificationStatus(Notification notification, boolean success) {
        if (success) {
            notification.setStatus(Notification.NotificationStatus.SENT);
            notification.setSentAt(LocalDateTime.now());
            notification.setErrorMessage(null);
        } else {
            if (notification.getDeliveryAttempts() >= notification.getMaxAttempts()) {
                notification.setStatus(Notification.NotificationStatus.FAILED);
            } else {
                notification.setStatus(Notification.NotificationStatus.PENDING);
                int delayMinutes = (int) Math.pow(2, notification.getDeliveryAttempts()) * 5;
                notification.setNextRetryAt(LocalDateTime.now().plusMinutes(delayMinutes));
            }
        }
        notificationRepository.save(notification);
    }

    private Notification buildNotificationEntity(NotificationRequest request) {
        Notification notification = new Notification();
        notification.setUserId(request.getUserId());
        notification.setRecipientEmail(request.getRecipientEmail());
        notification.setRecipientPhone(request.getRecipientPhone());
        notification.setType(request.getType());
        notification.setChannel(request.getChannel());
        notification.setSubject(request.getSubject());
        notification.setContent(request.getContent());
        notification.setTemplateName(request.getTemplateName());
        notification.setMaxAttempts(request.getMaxAttempts());
        notification.setStatus(Notification.NotificationStatus.PENDING);
        notification.setReadStatus(Notification.NotificationReadStatus.UNREAD);
        notification.setReadAt(null);
        notification.setDeliveryAttempts(0);

        if (request.getTemplateData() != null) {
            try {
                notification.setTemplateData(objectMapper.writeValueAsString(request.getTemplateData()));
            } catch (Exception e) {
                log.warn("Failed to serialize template data: {}", e.getMessage());
            }
        }

        return notification;
    }
}
