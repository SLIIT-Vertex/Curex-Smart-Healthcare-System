package com.curex.notification.repository;

import com.curex.notification.entity.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, String> {

    /**
     * Find notifications by user ID
     */
    List<Notification> findByUserIdOrderByCreatedAtDesc(String userId);

    /**
     * Find notifications by status
     */
    List<Notification> findByStatus(Notification.NotificationStatus status);

    /**
     * Find notifications by type
     */
    List<Notification> findByType(Notification.NotificationType type);

    /**
     * Find notifications by channel
     */
    List<Notification> findByChannel(Notification.NotificationChannel channel);

    /**
     * Find pending notifications for retry
     */
    @Query("SELECT n FROM Notification n WHERE n.status = 'FAILED' AND " +
           "n.deliveryAttempts < n.maxAttempts AND " +
           "n.nextRetryAt <= :currentTime")
    List<Notification> findNotificationsForRetry(@Param("currentTime") LocalDateTime currentTime);

    /**
     * Find notifications by user ID with pagination
     */
    Page<Notification> findByUserIdOrderByCreatedAtDesc(String userId, Pageable pageable);

    Page<Notification> findByUserIdAndChannelOrderByCreatedAtDesc(
           String userId,
           Notification.NotificationChannel channel,
           Pageable pageable);

    Page<Notification> findByUserIdAndReadStatusOrderByCreatedAtDesc(
           String userId,
           Notification.NotificationReadStatus readStatus,
           Pageable pageable);

    Page<Notification> findByUserIdAndReadStatusAndChannelOrderByCreatedAtDesc(
           String userId,
           Notification.NotificationReadStatus readStatus,
           Notification.NotificationChannel channel,
           Pageable pageable);

    Optional<Notification> findByIdAndUserId(String id, String userId);

    /**
     * Find notifications by multiple criteria
     */
    @Query("SELECT n FROM Notification n WHERE " +
           "(:userId IS NULL OR n.userId = :userId) AND " +
           "(:type IS NULL OR n.type = :type) AND " +
           "(:channel IS NULL OR n.channel = :channel) AND " +
           "(:status IS NULL OR n.status = :status) " +
           "ORDER BY n.createdAt DESC")
    Page<Notification> findNotifications(
        @Param("userId") String userId,
        @Param("type") Notification.NotificationType type,
        @Param("channel") Notification.NotificationChannel channel,
        @Param("status") Notification.NotificationStatus status,
        Pageable pageable
    );

    /**
     * Count notifications by status
     */
    long countByStatus(Notification.NotificationStatus status);

    /**
     * Count notifications by user and status
     */
    long countByUserIdAndStatus(String userId, Notification.NotificationStatus status);

              long countByUserIdAndReadStatus(String userId, Notification.NotificationReadStatus readStatus);

           long countByUserIdAndReadStatusAndChannel(
                  String userId,
                  Notification.NotificationReadStatus readStatus,
                  Notification.NotificationChannel channel);

    /**
     * Find notifications created between dates
     */
    List<Notification> findByCreatedAtBetween(LocalDateTime startDate, LocalDateTime endDate);

    /**
     * Find failed notifications that exceeded max attempts
     */
    @Query("SELECT n FROM Notification n WHERE n.status = 'FAILED' AND " +
           "n.deliveryAttempts >= n.maxAttempts")
    List<Notification> findFailedNotificationsExceededAttempts();

    /**
     * Delete old notifications (cleanup job)
     */
    @Modifying
    @Query("DELETE FROM Notification n WHERE n.createdAt < :cutoffDate AND " +
           "n.status NOT IN ('PENDING', 'PROCESSING')")
    void deleteOldNotifications(@Param("cutoffDate") LocalDateTime cutoffDate);

    @Modifying
    @Query("UPDATE Notification n SET n.readStatus = 'READ', n.readAt = :readAt " +
           "WHERE n.id = :notificationId AND n.userId = :userId AND n.readStatus = 'UNREAD'")
    int markAsRead(@Param("userId") String userId,
                   @Param("notificationId") String notificationId,
                   @Param("readAt") LocalDateTime readAt);

    @Modifying
    @Query("UPDATE Notification n SET n.readStatus = 'READ', n.readAt = :readAt " +
           "WHERE n.userId = :userId AND n.readStatus = 'UNREAD'")
    int markAllAsRead(@Param("userId") String userId,
                      @Param("readAt") LocalDateTime readAt);

    @Modifying
    @Query("UPDATE Notification n SET n.readStatus = 'READ', n.readAt = :readAt " +
           "WHERE n.userId = :userId AND n.readStatus = 'UNREAD' AND n.channel = :channel")
    int markAllAsReadByChannel(@Param("userId") String userId,
                               @Param("channel") Notification.NotificationChannel channel,
                               @Param("readAt") LocalDateTime readAt);

    /**
     * Get notification statistics
     */
    @Query("SELECT " +
           "COUNT(CASE WHEN n.status = 'SENT' THEN 1 END) as sent, " +
           "COUNT(CASE WHEN n.status = 'DELIVERED' THEN 1 END) as delivered, " +
           "COUNT(CASE WHEN n.status = 'FAILED' THEN 1 END) as failed, " +
           "COUNT(CASE WHEN n.status = 'PENDING' THEN 1 END) as pending " +
           "FROM Notification n WHERE n.createdAt >= :fromDate")
    Object[] getNotificationStatistics(@Param("fromDate") LocalDateTime fromDate);

       long deleteByUserId(String userId);
}