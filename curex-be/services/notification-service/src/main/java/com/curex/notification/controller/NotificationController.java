package com.curex.notification.controller;

import com.curex.notification.dto.NotificationRequest;
import com.curex.notification.dto.NotificationResponse;
import com.curex.notification.entity.Notification;
import com.curex.notification.service.NotificationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @PostMapping("/send")
    public ResponseEntity<NotificationResponse> sendNotification(
            @Valid @RequestBody NotificationRequest request) {
        return ResponseEntity.ok(notificationService.sendNotification(request));
    }

    @PostMapping("/send-async")
    public ResponseEntity<Map<String, String>> sendNotificationAsync(
            @Valid @RequestBody NotificationRequest request) {
        notificationService.sendNotificationAsync(request);
        return ResponseEntity.accepted()
                .body(Map.of("message", "Notification queued for delivery", "status", "QUEUED"));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<Map<String, Object>> getUserNotifications(
            @PathVariable String userId,
                        @RequestParam(required = false) Notification.NotificationReadStatus readStatus,
                        @RequestParam(required = false) Notification.NotificationChannel channel,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

                Notification.NotificationChannel effectiveChannel =
                                channel != null ? channel : Notification.NotificationChannel.IN_APP;

        Page<NotificationResponse> notifications =
                                notificationService.getUserNotifications(userId, readStatus, effectiveChannel, page, size);
        return ResponseEntity.ok(Map.of(
                "notifications", notifications.getContent(),
                "currentPage", notifications.getNumber(),
                "totalItems", notifications.getTotalElements(),
                "totalPages", notifications.getTotalPages(),
                "hasNext", notifications.hasNext(),
                "hasPrevious", notifications.hasPrevious()
        ));
    }

        @GetMapping("/user/{userId}/unread-count")
            public ResponseEntity<Map<String, Object>> getUnreadCount(
                    @PathVariable String userId,
                    @RequestParam(required = false) Notification.NotificationChannel channel) {
                Notification.NotificationChannel effectiveChannel =
                        channel != null ? channel : Notification.NotificationChannel.IN_APP;
                long unreadCount = notificationService.getUnreadCount(userId, effectiveChannel);
                return ResponseEntity.ok(Map.of("userId", userId, "unreadCount", unreadCount));
            }

        @PutMapping("/user/{userId}/{notificationId}/read")
        public ResponseEntity<Map<String, String>> markAsRead(
                        @PathVariable String userId,
                        @PathVariable String notificationId) {
                notificationService.markAsRead(userId, notificationId);
                return ResponseEntity.ok(Map.of("message", "Notification marked as read"));
        }

    @PutMapping("/user/{userId}/read-all")
    public ResponseEntity<Map<String, Object>> markAllAsRead(
            @PathVariable String userId,
            @RequestParam(required = false) Notification.NotificationChannel channel) {
        Notification.NotificationChannel effectiveChannel =
                channel != null ? channel : Notification.NotificationChannel.IN_APP;
        int updatedCount = notificationService.markAllAsRead(userId, effectiveChannel);
        return ResponseEntity.ok(Map.of(
                "message", "Notifications marked as read",
                "updatedCount", updatedCount
        ));
    }

    @GetMapping("/{notificationId}")
    public ResponseEntity<NotificationResponse> getNotificationById(
            @PathVariable String notificationId) {
        return ResponseEntity.ok(notificationService.getNotificationById(notificationId));
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> getNotifications(
            @RequestParam(required = false) String userId,
            @RequestParam(required = false) Notification.NotificationType type,
            @RequestParam(required = false) Notification.NotificationChannel channel,
            @RequestParam(required = false) Notification.NotificationStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Page<NotificationResponse> notifications =
                notificationService.getNotifications(userId, type, channel, status, page, size);
        return ResponseEntity.ok(Map.of(
                "notifications", notifications.getContent(),
                "currentPage", notifications.getNumber(),
                "totalItems", notifications.getTotalElements(),
                "totalPages", notifications.getTotalPages()
        ));
    }

    @PutMapping("/{notificationId}/cancel")
    public ResponseEntity<Map<String, String>> cancelNotification(
            @PathVariable String notificationId) {
        notificationService.cancelNotification(notificationId);
        return ResponseEntity.ok(Map.of("message", "Notification cancelled successfully"));
    }

    @PostMapping("/retry-failed")
    public ResponseEntity<Map<String, String>> retryFailedNotifications() {
        notificationService.retryFailedNotifications();
        return ResponseEntity.ok(Map.of("message", "Retry process initiated for failed notifications"));
    }

    @GetMapping("/statistics")
    public ResponseEntity<Map<String, Object>> getNotificationStatistics(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
            LocalDateTime fromDate) {

        LocalDateTime from = fromDate != null ? fromDate : LocalDateTime.now().minusDays(7);
        Object[] stats = notificationService.getNotificationStatistics(from);

        Map<String, Object> response = (stats != null && stats.length >= 4)
                ? Map.of("sent", stats[0], "delivered", stats[1], "failed", stats[2],
                        "pending", stats[3], "fromDate", from)
                : Map.of("sent", 0, "delivered", 0, "failed", 0, "pending", 0, "fromDate", from);

        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/cleanup")
    public ResponseEntity<Map<String, String>> cleanupOldNotifications(
            @RequestParam(defaultValue = "30") int daysOld) {
        notificationService.cleanupOldNotifications(daysOld);
        return ResponseEntity.ok(Map.of("message",
                String.format("Cleanup completed for notifications older than %d days", daysOld)));
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "service", "notification-service",
                "timestamp", String.valueOf(System.currentTimeMillis())
        ));
    }
}
