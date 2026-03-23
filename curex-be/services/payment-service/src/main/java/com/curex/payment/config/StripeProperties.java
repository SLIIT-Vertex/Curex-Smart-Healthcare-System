package com.curex.payment.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "stripe")
public class StripeProperties {

    /**
     * Stripe secret key (test mode key starts with: sk_test_...)
     */
    private String secretKey;

    /**
     * Stripe webhook signing secret (starts with: whsec_...)
     */
    private String webhookSecret;

    /**
     * URL where Stripe will redirect after successful payment.
     */
    private String successUrl;

    /**
     * URL where Stripe will redirect if user cancels payment.
     */
    private String cancelUrl;

    public String getSecretKey() {
        return secretKey;
    }

    public void setSecretKey(String secretKey) {
        this.secretKey = secretKey;
    }

    public String getWebhookSecret() {
        return webhookSecret;
    }

    public void setWebhookSecret(String webhookSecret) {
        this.webhookSecret = webhookSecret;
    }

    public String getSuccessUrl() {
        return successUrl;
    }

    public void setSuccessUrl(String successUrl) {
        this.successUrl = successUrl;
    }

    public String getCancelUrl() {
        return cancelUrl;
    }

    public void setCancelUrl(String cancelUrl) {
        this.cancelUrl = cancelUrl;
    }
}
