package com.curex.notification.dto.textlk;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Generic envelope returned by every Text.lk API endpoint.
 *
 * Successful:  { "status": "success", "data": { ... } }
 * Error:       { "status": "error",   "message": "..." }
 */
@Getter
@Setter
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class TextLkApiResponse {

    private String status;
    private String message;

    /** Present on send/campaign success — contains message UID etc. */
    private Object data;

    public boolean isSuccess() {
        return "success".equalsIgnoreCase(status);
    }
}
