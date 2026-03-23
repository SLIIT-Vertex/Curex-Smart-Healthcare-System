package com.curex.notification.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Binds all textlk.* properties from application.yml.
 *
 * Required env vars:
 *   TEXT_LK_API_TOKEN   — Bearer token from Text.lk dashboard
 *   TEXT_LK_SENDER_ID   — Approved sender ID (e.g. "CUREX")
 */
@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "textlk")
public class TextLkProperties {

    /** Bearer token for the Text.lk API. */
    private String apiToken;

    /** Text.lk REST API base URL. */
    private String apiBaseUrl = "https://app.text.lk/api/v3";

    /** Approved sender ID shown on recipient's phone. */
    private String senderId;

    public boolean isConfigured() {
        return apiToken != null && !apiToken.isBlank()
                && senderId != null && !senderId.isBlank();
    }
}
