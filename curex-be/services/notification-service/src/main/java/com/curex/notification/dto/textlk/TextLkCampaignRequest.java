package com.curex.notification.dto.textlk;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Getter;

/**
 * Payload for POST /sms/campaign (send to a saved contact list).
 */
@Getter
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class TextLkCampaignRequest {

    /** Contact list ID(s). Comma-separated for multiple lists. */
    private String recipient;

    @JsonProperty("sender_id")
    private String senderId;

    @Builder.Default
    private String type = "plain";

    private String message;

    @JsonProperty("schedule_time")
    private String scheduleTime;

    @JsonProperty("dlt_template_id")
    private String dltTemplateId;
}
