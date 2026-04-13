package com.curex.notification.controller;

import com.curex.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/internal/users")
@RequiredArgsConstructor
public class InternalUserDataController {

    private final NotificationService notificationService;

    @DeleteMapping("/{userId}/purge")
    public ResponseEntity<Map<String, Long>> purgeUserData(@PathVariable String userId) {
        long deletedNotifications = notificationService.purgeUserData(userId);
        return ResponseEntity.ok(Map.of(
                "deletedNotifications", deletedNotifications,
                "totalDeleted", deletedNotifications
        ));
    }
}
