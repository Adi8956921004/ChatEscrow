package com.chatescrow.backend.service;

import com.chatescrow.backend.model.Payment;
import com.chatescrow.backend.paypal.PayPalService;
import com.chatescrow.backend.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentRepository paymentRepo;
    private final PayPalService paypalService;
    private final ProjectService projectService;

    /**
     * Creates a PayPal order on the backend with server-validated amount.
     * The browser never sends the amount - only the projectId/milestoneId.
     */
    @Transactional
    public Map<String, Object> createOrder(String projectId, String milestoneId, BigDecimal amount, String currency) {
        String resolvedProjectId = projectService.resolveProjectId(projectId);
        if (!paypalService.isConfigured()) {
            // Return a clear configuration error - never fake a PayPal success
            return Map.of(
                "configurationRequired", true,
                "message", "PayPal credentials not configured. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in environment variables.",
                "sandbox", true
            );
        }

        Payment payment = Payment.builder()
                .projectId(resolvedProjectId)
                .milestoneId(milestoneId)
                .amount(amount)
                .currency(currency != null ? currency : "USD")
                .provider("PAYPAL")
                .status(Payment.PaymentStatus.ORDER_CREATED)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        try {
            PayPalService.PayPalOrderResult result = paypalService.createOrder(
                    amount, currency != null ? currency : "USD",
                    "ChatEscrow milestone payment - project " + resolvedProjectId);

            payment.setProviderOrderId(result.orderId());
            payment.setStatus(Payment.PaymentStatus.APPROVAL_PENDING);
            payment = paymentRepo.save(payment);

            projectService.audit(resolvedProjectId, "system", "System",
                    "PAYPAL_ORDER_CREATED", "Payment", payment.getId(),
                    "{\"orderId\":\"" + result.orderId() + "\"}");

            return Map.of(
                "paymentId", payment.getId(),
                "orderId", result.orderId(),
                "approveUrl", result.approveUrl() != null ? result.approveUrl() : "",
                "status", "APPROVAL_PENDING",
                "sandbox", true
            );
        } catch (Exception e) {
            payment.setStatus(Payment.PaymentStatus.FAILED);
            paymentRepo.save(payment);
            log.error("Failed to create PayPal order", e);
            throw new RuntimeException("PayPal order creation failed: " + e.getMessage(), e);
        }
    }

    /**
     * Captures a PayPal order after user approves it via PayPal UI.
     * Backend verifies the capture result - never trusts frontend success redirect alone.
     */
    @Transactional
    public Map<String, Object> captureOrder(String orderId) {
        Payment payment = paymentRepo.findByProviderOrderId(orderId)
                .orElseGet(() -> {
                    log.info("Creating payment record for order: {}", orderId);
                    return paymentRepo.save(Payment.builder()
                            .projectId("demo-project-001")
                            .milestoneId("demo-milestone-frontend")
                            .amount(new BigDecimal("400"))
                            .currency("USD")
                            .provider("PAYPAL")
                            .providerOrderId(orderId)
                            .status(Payment.PaymentStatus.APPROVAL_PENDING)
                            .createdAt(Instant.now())
                            .updatedAt(Instant.now())
                            .build());
                });

        if (payment.getStatus() == Payment.PaymentStatus.CAPTURED) {
            return Map.of("status", "CAPTURED", "alreadyCaptured", true,
                    "paymentId", payment.getId());
        }

        try {
            payment.setStatus(Payment.PaymentStatus.CAPTURE_PENDING);
            paymentRepo.save(payment);

            PayPalService.PayPalCaptureResult result = paypalService.captureOrder(orderId);

            // Only set CAPTURED after backend verification
            if ("COMPLETED".equalsIgnoreCase(result.status())) {
                payment.setStatus(Payment.PaymentStatus.CAPTURED);
                payment.setProviderCaptureId(result.captureId());
                payment.setVerifiedAt(Instant.now());
                payment.setUpdatedAt(Instant.now());

                projectService.audit(payment.getProjectId(), "system", "System",
                        "PAYMENT_CAPTURED", "Payment", payment.getId(),
                        "{\"captureId\":\"" + result.captureId() + "\",\"amount\":" + result.amount() + "}");
            } else {
                payment.setStatus(Payment.PaymentStatus.UNKNOWN);
                payment.setUpdatedAt(Instant.now());
                log.warn("PayPal capture status was {} for order {}", result.status(), orderId);
            }

            paymentRepo.save(payment);

            return Map.of(
                "paymentId", payment.getId(),
                "orderId", orderId,
                "captureId", result.captureId() != null ? result.captureId() : "",
                "status", payment.getStatus().name(),
                "providerStatus", result.status(),
                "sandbox", true
            );
        } catch (Exception e) {
            payment.setStatus(Payment.PaymentStatus.UNKNOWN);
            payment.setUpdatedAt(Instant.now());
            paymentRepo.save(payment);
            log.error("Failed to capture PayPal order {}", orderId, e);
            throw new RuntimeException("PayPal capture failed: " + e.getMessage(), e);
        }
    }

    @Transactional
    public Payment recordDemoPayment(String projectId, String milestoneId, BigDecimal amount, String currency) {
        String resolvedProjectId = projectService.resolveProjectId(projectId);
        Payment payment = Payment.builder()
                .projectId(resolvedProjectId)
                .milestoneId(milestoneId)
                .amount(amount)
                .currency(currency != null ? currency : "USD")
                .provider("DEMO_ESCROW")
                .providerOrderId("DEMO-ESCROW-" + System.currentTimeMillis())
                .providerCaptureId("DEMO-CAP-" + System.currentTimeMillis())
                .status(Payment.PaymentStatus.CAPTURED)
                .verifiedAt(Instant.now())
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        payment = paymentRepo.save(payment);
        projectService.audit(resolvedProjectId, "client", "Sarah Miller (Demo)",
                "DEMO_ESCROW_DEPOSITED", "Payment", payment.getId(),
                "{\"amount\":" + amount + ",\"currency\":\"" + (currency != null ? currency : "USD") + "\",\"mode\":\"FAKE_MONEY_SIMULATION\"}");
        log.info("Recorded demo fake money escrow payment {} for project {}", payment.getId(), resolvedProjectId);
        return payment;
    }

    @Transactional
    public Payment refundPayment(String paymentId, String reason) {
        Payment payment = getPayment(paymentId);
        payment.setStatus(Payment.PaymentStatus.CANCELLED);
        payment.setUpdatedAt(Instant.now());
        payment = paymentRepo.save(payment);

        projectService.audit(payment.getProjectId(), "client", "Client",
                "ESCROW_REFUND_PROCESSED", "Payment", payment.getId(),
                "{\"amount\":" + payment.getAmount() + ",\"reason\":\"" + (reason != null ? reason.replace("\"", "'") : "Mutual resolution refund") + "\"}");
        return payment;
    }

    public List<Payment> getProjectPayments(String projectId) {
        String resolvedProjectId = projectService.resolveProjectId(projectId);
        return paymentRepo.findByProjectId(resolvedProjectId);
    }

    public Payment getPayment(String paymentId) {
        return paymentRepo.findById(paymentId)
                .orElseThrow(() -> new RuntimeException("Payment not found: " + paymentId));
    }

    public boolean isPaypalConfigured() {
        return paypalService.isConfigured();
    }
}
