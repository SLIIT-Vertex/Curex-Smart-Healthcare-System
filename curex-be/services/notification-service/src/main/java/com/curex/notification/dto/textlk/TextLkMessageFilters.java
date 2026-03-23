package com.curex.notification.dto.textlk;

import lombok.Builder;
import lombok.Getter;

/**
 * Optional query filters for GET /sms (list all messages).
 */
@Getter
@Builder
public class TextLkMessageFilters {

    /** Format: "YYYY-MM-DD HH:MM:SS" */
    private String startDate;

    /** Format: "YYYY-MM-DD HH:MM:SS" */
    private String endDate;

    /** plain | unicode | voice | mms | whatsapp | otp | viber */
    private String smsType;

    /** outgoing | incoming | api */
    private String direction;

    /** e.g. "Asia/Colombo", "UTC" */
    private String timezone;

    private Integer page;
}
