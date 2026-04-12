package com.curex.payment.service;

import com.curex.payment.dto.CreatePaymentRequest;
import com.curex.payment.dto.PaymentResponse;
import com.curex.payment.dto.StripeCheckoutResponse;
import com.curex.payment.entity.Payment;
import com.curex.payment.entity.PaymentStatus;
import com.curex.payment.event.PaymentConfirmedEvent;
import com.curex.payment.event.PaymentEventPublisher;
import com.curex.payment.exception.PaymentException;
import com.curex.payment.exception.ResourceNotFoundException;
import com.curex.payment.repository.PaymentRepository;
import com.stripe.model.Event;
import com.stripe.model.EventDataObjectDeserializer;
import com.stripe.model.StripeObject;
import com.stripe.model.checkout.Session;
import lombok.extern.slf4j.Slf4j;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentServiceImpl implements PaymentService {

    private final PaymentRepository paymentRepository;
    private final StripeService stripeService;
    private final PaymentEventPublisher paymentEventPublisher;

    @Override
    @Transactional
    public StripeCheckoutResponse createPaymentForAppointment(String appointmentId, CreatePaymentRequest request) {
        if (!StringUtils.hasText(appointmentId)) {
            throw new PaymentException("appointmentId is required");
        }

        Payment payment = Payment.builder()
                .appointmentId(appointmentId)
                .patientId(request.getPatientId())
                .amount(request.getAmount())
                .currency(request.getCurrency())
                .status(PaymentStatus.PENDING)
                .paymentMethod("STRIPE_CHECKOUT")
                .build();

        // Save first so we have a DB id to put into Stripe metadata.
        payment = paymentRepository.save(payment);

        Session session = stripeService.createCheckoutSession(payment, request.getSuccessUrl(), request.getCancelUrl());

        payment.setStripeSessionId(session.getId());
        // For Checkout, payment intent id may be null until completion.
        paymentRepository.save(payment);

        return StripeCheckoutResponse.builder()
                .paymentId(payment.getId())
                .appointmentId(payment.getAppointmentId())
                .patientId(payment.getPatientId())
                .amount(payment.getAmount())
                .currency(payment.getCurrency())
                .status(payment.getStatus())
                .stripeSessionId(session.getId())
                .checkoutUrl(session.getUrl())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public PaymentResponse getPayment(UUID id) {
        Payment payment = paymentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Payment not found: " + id));
        return toResponse(payment);
    }

    @Override
    @Transactional
    public List<PaymentResponse> getPaymentsForPatient(String patientId) {
        if (!StringUtils.hasText(patientId)) {
            throw new PaymentException("patientId is required");
        }
        List<Payment> payments = paymentRepository.findByPatientIdOrderByCreatedAtDesc(patientId);
        reconcilePendingStripePayments(payments);
        return payments.stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<PaymentResponse> getAdminPayments(String status, String patientId, String appointmentId) {
        String normalizedStatus = StringUtils.hasText(status) ? status.trim().toUpperCase(Locale.ROOT) : null;
        String normalizedPatientId = StringUtils.hasText(patientId) ? patientId.trim() : null;
        String normalizedAppointmentId = StringUtils.hasText(appointmentId) ? appointmentId.trim() : null;

        PaymentStatus requestedStatus = null;
        if (normalizedStatus != null) {
            try {
                requestedStatus = PaymentStatus.valueOf(normalizedStatus);
            } catch (IllegalArgumentException ex) {
                throw new PaymentException("Invalid status filter: " + status);
            }
        }

        PaymentStatus finalRequestedStatus = requestedStatus;
        return paymentRepository.findAllByOrderByCreatedAtDesc().stream()
                .filter(payment -> finalRequestedStatus == null || payment.getStatus() == finalRequestedStatus)
                .filter(payment -> normalizedPatientId == null || normalizedPatientId.equals(payment.getPatientId()))
                .filter(payment -> normalizedAppointmentId == null
                        || normalizedAppointmentId.equals(payment.getAppointmentId()))
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional
    public long purgeUserData(String userId) {
        if (!StringUtils.hasText(userId)) {
            throw new PaymentException("userId is required");
        }
        return paymentRepository.deleteByPatientId(userId.trim());
    }

    @Override
    @Transactional
    public void handleStripeWebhook(String payload, String signatureHeader) {
        Event event = stripeService.verifyAndConstructEvent(payload, signatureHeader);
        log.info("Stripe webhook verified: type={} id={}", event.getType(), event.getId());

        switch (event.getType()) {
            case "checkout.session.completed" -> handleCheckoutSessionCompleted(event);
            case "checkout.session.expired" -> handleCheckoutSessionExpired(event);
            default -> {
                log.info("Ignoring unsupported Stripe event type={}", event.getType());
            }
        }
    }

    /**
     * Tricky area: we must safely deserialize the embedded Stripe object.
     */
    private void handleCheckoutSessionCompleted(Event event) {
        Session session = deserializeSession(event)
                .orElse(null);
        if (session == null || !StringUtils.hasText(session.getId())) {
            log.warn("checkout.session.completed received without valid session payload. eventId={}", event.getId());
            return;
        }

        log.info("Processing checkout.session.completed for stripeSessionId={}", session.getId());

        paymentRepository.findByStripeSessionId(session.getId()).ifPresent(payment -> {
            markPaymentSuccessfulAndPublish(payment, session.getPaymentIntent(), "webhook");
        });

        if (paymentRepository.findByStripeSessionId(session.getId()).isEmpty()) {
            log.warn("No payment row found for stripeSessionId={}. Webhook cannot mark payment SUCCESS.", session.getId());
        }
    }

    private void handleCheckoutSessionExpired(Event event) {
        Session session = deserializeSession(event)
                .orElse(null);
        if (session == null || !StringUtils.hasText(session.getId())) {
            return;
        }

        paymentRepository.findByStripeSessionId(session.getId()).ifPresent(payment -> {
            // Treat expired checkout as cancelled for demo purposes.
            payment.setStatus(PaymentStatus.CANCELLED);
            paymentRepository.save(payment);
        });
    }

    private Optional<Session> deserializeSession(Event event) {
        EventDataObjectDeserializer deserializer = event.getDataObjectDeserializer();
        Optional<StripeObject> stripeObject = deserializer.getObject();
        if (stripeObject.isPresent() && stripeObject.get() instanceof Session session) {
            return Optional.of(session);
        }

        // Fallback for Stripe API-version mismatches where safe deserialization is unavailable.
        try {
            StripeObject unsafe = deserializer.deserializeUnsafe();
            if (unsafe instanceof Session session) {
                return Optional.of(session);
            }
        } catch (Exception ex) {
            log.warn("Unsafe Stripe event deserialization failed for eventId={}: {}",
                    event.getId(), ex.getMessage());
        }

        return Optional.empty();
    }

    private void reconcilePendingStripePayments(List<Payment> payments) {
        for (Payment payment : payments) {
            if (payment.getStatus() != PaymentStatus.PENDING) {
                continue;
            }

            if (!StringUtils.hasText(payment.getStripeSessionId())) {
                continue;
            }

            try {
                Session session = stripeService.retrieveCheckoutSession(payment.getStripeSessionId());
                String paymentStatus = String.valueOf(session.getPaymentStatus()).toLowerCase(Locale.ROOT);
                String checkoutStatus = String.valueOf(session.getStatus()).toLowerCase(Locale.ROOT);

                boolean paid = "paid".equals(paymentStatus);
                boolean completed = "complete".equals(checkoutStatus);

                if (paid || completed) {
                    log.info("Reconciled pending payment as SUCCESS via Stripe session lookup. paymentId={} stripeSessionId={}",
                            payment.getId(), payment.getStripeSessionId());
                    markPaymentSuccessfulAndPublish(payment, session.getPaymentIntent(), "reconcile");
                }
            } catch (Exception ex) {
                log.debug("Stripe reconcile skipped for paymentId={} stripeSessionId={}: {}",
                        payment.getId(), payment.getStripeSessionId(), ex.getMessage());
            }
        }
    }

    private void markPaymentSuccessfulAndPublish(Payment payment, String stripePaymentIntentId, String source) {
        // Idempotency: Stripe webhooks and fallback reconciliation can both hit this path.
        if (payment.getStatus() == PaymentStatus.SUCCESS) {
            log.info("Payment already SUCCESS for paymentId={} (source={}, idempotent skip)",
                    payment.getId(), source);
            return;
        }

        payment.setStatus(PaymentStatus.SUCCESS);
        payment.setStripePaymentIntentId(stripePaymentIntentId);
        payment.setPaymentMethod("CARD");
        Payment saved = paymentRepository.save(payment);

        PaymentConfirmedEvent confirmedEvent = PaymentConfirmedEvent.builder()
                .paymentId(saved.getId())
                .appointmentId(saved.getAppointmentId())
                .patientId(saved.getPatientId())
                .amount(saved.getAmount())
                .currency(saved.getCurrency())
                .status(saved.getStatus())
                .timestamp(saved.getUpdatedAt())
                .build();

        log.info("Publishing payment.confirmed from {} for appointmentId={} paymentId={}",
                source, saved.getAppointmentId(), saved.getId());
        paymentEventPublisher.publishPaymentConfirmed(confirmedEvent);
    }

    private PaymentResponse toResponse(Payment payment) {
        return PaymentResponse.builder()
                .id(payment.getId())
                .appointmentId(payment.getAppointmentId())
                .patientId(payment.getPatientId())
                .amount(payment.getAmount())
                .currency(payment.getCurrency())
                .status(payment.getStatus())
                .stripeSessionId(payment.getStripeSessionId())
                .stripePaymentIntentId(payment.getStripePaymentIntentId())
                .paymentMethod(payment.getPaymentMethod())
                .createdAt(payment.getCreatedAt())
                .updatedAt(payment.getUpdatedAt())
                .build();
    }
}
