package com.curex.payment.service;

import com.curex.payment.entity.Payment;
import com.stripe.model.Event;
import com.stripe.model.checkout.Session;

import java.util.Optional;

/**
 * Stripe integration boundary.
 *
 * Kept separate from business logic so PaymentService can be tested/mocked
 * easily.
 */
public interface StripeService {

    /**
     * Create a Stripe Checkout Session for the given payment.
     */
    Session createCheckoutSession(Payment payment, String successUrl, String cancelUrl);

    /**
     * Verify Stripe webhook signature and construct the Event.
     *
     * @param payload         raw request body (must be unmodified)
     * @param signatureHeader value of 'Stripe-Signature' header
     */
    Event verifyAndConstructEvent(String payload, String signatureHeader);

    /**
     * Retrieve an existing Stripe Checkout Session by id.
     */
    Optional<Session> retrieveCheckoutSession(String sessionId);
}
