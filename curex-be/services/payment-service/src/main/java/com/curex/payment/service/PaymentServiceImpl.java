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
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
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

        Session session = stripeService.createCheckoutSession(payment);

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
    @Transactional(readOnly = true)
    public List<PaymentResponse> getPaymentsForPatient(String patientId) {
        if (!StringUtils.hasText(patientId)) {
            throw new PaymentException("patientId is required");
        }
        return paymentRepository.findByPatientIdOrderByCreatedAtDesc(patientId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional
    public void handleStripeWebhook(String payload, String signatureHeader) {
        Event event = stripeService.verifyAndConstructEvent(payload, signatureHeader);

        switch (event.getType()) {
            case "checkout.session.completed" -> handleCheckoutSessionCompleted(event);
            case "checkout.session.expired" -> handleCheckoutSessionExpired(event);
            default -> {
                // Safely ignore unsupported event types.
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
            return;
        }

        paymentRepository.findByStripeSessionId(session.getId()).ifPresent(payment -> {
            // Idempotency: Stripe may retry webhooks; only publish once when transitioning.
            if (payment.getStatus() == PaymentStatus.SUCCESS) {
                return;
            }

            payment.setStatus(PaymentStatus.SUCCESS);
            payment.setStripePaymentIntentId(session.getPaymentIntent());
            // Real card brand can be fetched via PaymentIntent/Charge, but keep demo
            // simple.
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

            paymentEventPublisher.publishPaymentConfirmed(confirmedEvent);
        });
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
        if (stripeObject.isEmpty()) {
            return Optional.empty();
        }
        if (stripeObject.get() instanceof Session session) {
            return Optional.of(session);
        }
        return Optional.empty();
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
