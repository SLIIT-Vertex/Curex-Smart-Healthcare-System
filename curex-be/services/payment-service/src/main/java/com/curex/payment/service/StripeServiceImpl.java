package com.curex.payment.service;

import com.curex.payment.config.StripeProperties;
import com.curex.payment.entity.Payment;
import com.stripe.Stripe;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.model.Event;
import com.stripe.model.checkout.Session;
import com.stripe.net.Webhook;
import com.stripe.param.checkout.SessionCreateParams;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Locale;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class StripeServiceImpl implements StripeService {

    /**
     * Stripe uses "smallest currency unit" for unit amounts.
     * Most currencies: 2 decimals (USD -> cents). Some are zero-decimal (JPY).
     */
    private static final Set<String> ZERO_DECIMAL_CURRENCIES = Set.of(
            "bif", "clp", "djf", "gnf", "jpy", "kmf", "krw", "mga", "pyg", "rwf",
            "ugx", "vnd", "vuv", "xaf", "xof", "xpf");

    private final StripeProperties stripeProperties;

    @PostConstruct
    void init() {
        // Stripe Java SDK uses a static apiKey. Set once at startup.
        if (StringUtils.hasText(stripeProperties.getSecretKey())) {
            Stripe.apiKey = stripeProperties.getSecretKey();
        }
    }

    @Override
    public Session createCheckoutSession(Payment payment) {
        if (payment == null) {
            throw new IllegalArgumentException("payment is required");
        }
        if (!StringUtils.hasText(stripeProperties.getSecretKey())) {
            throw new IllegalStateException(
                    "Stripe secret key is not configured (stripe.secret-key / STRIPE_SECRET_KEY)");
        }

        // Ensure apiKey is set even if properties were loaded after init (safe re-set).
        Stripe.apiKey = stripeProperties.getSecretKey();

        String currency = normalizeCurrency(payment.getCurrency());
        long unitAmount = toStripeUnitAmount(payment.getAmount(), currency);

        // Tricky area: success_url should include {CHECKOUT_SESSION_ID} placeholder so
        // frontend can fetch session if needed.
        String successUrl = ensureSessionIdPlaceholder(stripeProperties.getSuccessUrl());
        String cancelUrl = stripeProperties.getCancelUrl();
        if (!StringUtils.hasText(successUrl) || !StringUtils.hasText(cancelUrl)) {
            throw new IllegalStateException(
                    "Stripe success/cancel URLs are not configured (stripe.success-url, stripe.cancel-url)");
        }

        SessionCreateParams params = SessionCreateParams.builder()
                .setMode(SessionCreateParams.Mode.PAYMENT)
                .setSuccessUrl(successUrl)
                .setCancelUrl(cancelUrl)
                // Client reference helps correlating in Stripe dashboard.
                .setClientReferenceId(payment.getAppointmentId())
                // Line item shown in Stripe Checkout.
                .addLineItem(SessionCreateParams.LineItem.builder()
                        .setQuantity(1L)
                        .setPriceData(SessionCreateParams.LineItem.PriceData.builder()
                                .setCurrency(currency)
                                .setUnitAmount(unitAmount)
                                .setProductData(SessionCreateParams.LineItem.PriceData.ProductData.builder()
                                        .setName("Appointment Payment")
                                        .build())
                                .build())
                        .build())
                // Metadata is the easiest way to link webhook events back to our DB record.
                .putMetadata("paymentId", payment.getId().toString())
                .putMetadata("appointmentId", payment.getAppointmentId())
                .putMetadata("patientId", payment.getPatientId())
                .build();

        try {
            return Session.create(params);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to create Stripe Checkout Session", e);
        }
    }

    @Override
    public Event verifyAndConstructEvent(String payload, String signatureHeader) {
        if (!StringUtils.hasText(stripeProperties.getWebhookSecret())) {
            throw new IllegalStateException(
                    "Stripe webhook secret is not configured (stripe.webhook-secret / STRIPE_WEBHOOK_SECRET)");
        }
        if (!StringUtils.hasText(signatureHeader)) {
            throw new IllegalArgumentException("Missing Stripe-Signature header");
        }

        // Tricky area: Stripe signature verification REQUIRES the raw request body (no
        // JSON parsing before this).
        try {
            return Webhook.constructEvent(payload, signatureHeader, stripeProperties.getWebhookSecret());
        } catch (SignatureVerificationException e) {
            throw new IllegalArgumentException("Invalid Stripe webhook signature", e);
        }
    }

    private String normalizeCurrency(String currency) {
        if (!StringUtils.hasText(currency)) {
            return "usd";
        }
        return currency.trim().toLowerCase(Locale.ROOT);
    }

    private long toStripeUnitAmount(BigDecimal amount, String currency) {
        if (amount == null) {
            throw new IllegalArgumentException("amount is required");
        }
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("amount must be > 0");
        }

        boolean zeroDecimal = ZERO_DECIMAL_CURRENCIES.contains(currency);
        BigDecimal scaled = zeroDecimal
                ? amount.setScale(0, RoundingMode.HALF_UP)
                : amount.multiply(BigDecimal.valueOf(100)).setScale(0, RoundingMode.HALF_UP);

        try {
            return scaled.longValueExact();
        } catch (ArithmeticException ex) {
            throw new IllegalArgumentException("amount is too large", ex);
        }
    }

    private String ensureSessionIdPlaceholder(String successUrl) {
        if (!StringUtils.hasText(successUrl)) {
            return successUrl;
        }
        if (successUrl.contains("{CHECKOUT_SESSION_ID}")) {
            return successUrl;
        }

        // Append as query param in a safe, readable way.
        return successUrl.contains("?")
                ? successUrl + "&session_id={CHECKOUT_SESSION_ID}"
                : successUrl + "?session_id={CHECKOUT_SESSION_ID}";
    }
}
