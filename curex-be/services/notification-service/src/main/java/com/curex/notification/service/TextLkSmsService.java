package com.curex.notification.service;

import com.curex.notification.config.TextLkProperties;
import com.curex.notification.dto.textlk.TextLkApiResponse;
import com.curex.notification.dto.textlk.TextLkCampaignRequest;
import com.curex.notification.dto.textlk.TextLkMessageFilters;
import com.curex.notification.dto.textlk.TextLkSendRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

/**
 * Low-level Text.lk SMS Gateway client.
 *
 * This is a 1:1 port of the JavaScript sms.service.js that was used in the
 * Node.js backend. Every public method mirrors its JS counterpart exactly:
 *   sendSms()        → sendSms()
 *   sendCampaign()   → sendCampaign()
 *   getSmsById()     → getSmsById()
 *   getAllMessages()  → getAllMessages()
 *   getCampaignById()→ getCampaignById()
 *   sendOtp()        → sendOtp()
 *   sendNotification()→ sendNotification()
 *
 * This class talks only to the Text.lk API. Business formatting lives in SmsService.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TextLkSmsService {

    private final TextLkProperties properties;
    private final RestTemplate restTemplate;

    // ── Core send operations ─────────────────────────────────────────────────────

    /**
     * Send SMS to a single or multiple recipients.
     *
     * @param recipient   Phone number(s), comma-separated for multiple
     * @param message     Body of the SMS
     * @param type        Message type (plain, unicode, otp, etc.) — defaults to "plain"
     * @param scheduleTime Optional schedule time "Y-m-d H:i"
     * @param dltTemplateId Optional DLT template ID
     * @return The Text.lk API response envelope
     */
    public TextLkApiResponse sendSms(String recipient, String message,
                                     String type, String scheduleTime, String dltTemplateId) {
        assertConfigured();

        TextLkSendRequest request = TextLkSendRequest.builder()
                .recipient(recipient)
                .senderId(properties.getSenderId())
                .type(type != null ? type : "plain")
                .message(message)
                .scheduleTime(scheduleTime)
                .dltTemplateId(dltTemplateId)
                .build();

        log.info("Sending SMS to recipient: {}", recipient);

        TextLkApiResponse response = post("/sms/send", request);

        if (response.isSuccess()) {
            log.info("SMS sent successfully to: {}", recipient);
        } else {
            log.warn("SMS send failed for recipient {}: {}", recipient, response.getMessage());
            throw new TextLkException(response.getMessage() != null
                    ? response.getMessage() : "Failed to send SMS");
        }

        return response;
    }

    /**
     * Convenience overload — sends a plain SMS with no scheduling.
     */
    public TextLkApiResponse sendSms(String recipient, String message) {
        return sendSms(recipient, message, "plain", null, null);
    }

    /**
     * Send OTP SMS.
     * Type is set to "otp" so Text.lk routes it through their OTP delivery path.
     *
     * @param recipient Phone number (e.g. 94710000000)
     * @param otp       OTP code
     * @param message   Custom message template; use {otp} as placeholder.
     *                  Falls back to a standard Curex template when null.
     */
    public TextLkApiResponse sendOtp(String recipient, String otp, String message) {
        String defaultTemplate = "Your Curex verification code is: " + otp
                + ". Do not share this code with anyone.";
        String body = (message != null)
                ? message.replace("{otp}", otp)
                : defaultTemplate;

        return sendSms(recipient, body, "otp", null, null);
    }

    /**
     * Send a plain notification SMS.
     */
    public TextLkApiResponse sendNotification(String recipient, String message) {
        return sendSms(recipient, message, "plain", null, null);
    }

    // ── Campaign ─────────────────────────────────────────────────────────────────

    /**
     * Send a campaign to a saved Text.lk contact list.
     *
     * @param contactListId Contact list ID(s), comma-separated for multiple
     * @param message       Body of the SMS
     * @param type          Message type — defaults to "plain"
     * @param scheduleTime  Optional schedule time "Y-m-d H:i"
     * @param dltTemplateId Optional DLT template ID
     */
    public TextLkApiResponse sendCampaign(String contactListId, String message,
                                          String type, String scheduleTime, String dltTemplateId) {
        assertConfigured();

        TextLkCampaignRequest request = TextLkCampaignRequest.builder()
                .recipient(contactListId)
                .senderId(properties.getSenderId())
                .type(type != null ? type : "plain")
                .message(message)
                .scheduleTime(scheduleTime)
                .dltTemplateId(dltTemplateId)
                .build();

        log.info("Sending campaign to contact list: {}", contactListId);

        TextLkApiResponse response = post("/sms/campaign", request);

        if (response.isSuccess()) {
            log.info("Campaign sent successfully to contact list: {}", contactListId);
        } else {
            log.warn("Campaign failed for list {}: {}", contactListId, response.getMessage());
            throw new TextLkException(response.getMessage() != null
                    ? response.getMessage() : "Failed to send campaign");
        }

        return response;
    }

    // ── Read operations ──────────────────────────────────────────────────────────

    /**
     * View a single SMS by UID.
     *
     * @param uid Unique message ID returned by Text.lk on send
     */
    public TextLkApiResponse getSmsById(String uid) {
        assertConfigured();
        log.info("Fetching SMS with uid: {}", uid);

        TextLkApiResponse response = get("/sms/" + uid, null);

        if (!response.isSuccess()) {
            throw new TextLkException(response.getMessage() != null
                    ? response.getMessage() : "SMS not found");
        }

        return response;
    }

    /**
     * List all messages with optional filters.
     *
     * @param filters Optional query filters — pass null for unfiltered list
     */
    public TextLkApiResponse getAllMessages(TextLkMessageFilters filters) {
        assertConfigured();

        MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
        if (filters != null) {
            if (filters.getStartDate() != null)  params.add("start_date", filters.getStartDate());
            if (filters.getEndDate() != null)    params.add("end_date",   filters.getEndDate());
            if (filters.getSmsType() != null)    params.add("sms_type",   filters.getSmsType());
            if (filters.getDirection() != null)  params.add("direction",  filters.getDirection());
            if (filters.getTimezone() != null)   params.add("timezone",   filters.getTimezone());
            if (filters.getPage() != null)       params.add("page",       String.valueOf(filters.getPage()));
        }

        log.info("Fetching all messages with filters: {}", params);

        TextLkApiResponse response = get("/sms", params);

        if (!response.isSuccess()) {
            throw new TextLkException(response.getMessage() != null
                    ? response.getMessage() : "Failed to fetch messages");
        }

        return response;
    }

    /**
     * View a campaign by UID.
     *
     * @param uid Unique campaign ID
     */
    public TextLkApiResponse getCampaignById(String uid) {
        assertConfigured();
        log.info("Fetching campaign with uid: {}", uid);

        TextLkApiResponse response = get("/campaign/" + uid + "/view", null);

        if (!response.isSuccess()) {
            throw new TextLkException(response.getMessage() != null
                    ? response.getMessage() : "Campaign not found");
        }

        return response;
    }

    // ── Infrastructure ───────────────────────────────────────────────────────────

    private TextLkApiResponse post(String path, Object body) {
        try {
            return restTemplate.postForObject(
                    properties.getApiBaseUrl() + path,
                    new HttpEntity<>(body, buildHeaders()),
                    TextLkApiResponse.class
            );
        } catch (HttpClientErrorException | HttpServerErrorException ex) {
            log.error("Text.lk API error [{}] on POST {}: {}", ex.getStatusCode(), path, ex.getResponseBodyAsString());
            throw new TextLkException("Text.lk API error: " + ex.getMessage(), ex);
        }
    }

    private TextLkApiResponse get(String path, MultiValueMap<String, String> queryParams) {
        String url = UriComponentsBuilder
                .fromHttpUrl(properties.getApiBaseUrl() + path)
                .queryParams(queryParams != null ? queryParams : new LinkedMultiValueMap<>())
                .toUriString();
        try {
            return restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    new HttpEntity<>(buildHeaders()),
                    TextLkApiResponse.class
            ).getBody();
        } catch (HttpClientErrorException | HttpServerErrorException ex) {
            log.error("Text.lk API error [{}] on GET {}: {}", ex.getStatusCode(), path, ex.getResponseBodyAsString());
            throw new TextLkException("Text.lk API error: " + ex.getMessage(), ex);
        }
    }

    private HttpHeaders buildHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(properties.getApiToken());
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE);
        return headers;
    }

    private void assertConfigured() {
        if (!properties.isConfigured()) {
            throw new TextLkException("Text.lk SMS gateway is not configured. "
                    + "Set TEXT_LK_API_TOKEN and TEXT_LK_SENDER_ID environment variables.");
        }
    }

    // ── Dedicated exception ──────────────────────────────────────────────────────

    public static class TextLkException extends RuntimeException {
        public TextLkException(String message) {
            super(message);
        }
        public TextLkException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
