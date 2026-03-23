package com.curex.notification.dto.textlk;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Getter;

/**
 * Payload for POST /sms/send
 * Maps 1:1 to the Text.lk API contract.
 */
@Getter
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class TextLkSendRequest {

    /** Phone number(s) to send message. Comma-separated for multiple recipients. */
    private String recipient;

    @JsonProperty("sender_id")
    private String senderId;

    /**
     * Message type: plain | unicode | voice | mms | whatsapp | otp | viber
     * Defaults to "plain".
     */
    @Builder.Default
    private String type = "plain";

    private String message;

    /** Optional. Schedule time in format "Y-m-d H:i" */
    @JsonProperty("schedule_time")
    private String scheduleTime;

    /** Optional. DLT template ID for regulatory compliance. */
    @JsonProperty("dlt_template_id")
    private String dltTemplateId;
}
