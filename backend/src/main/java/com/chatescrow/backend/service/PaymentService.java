package com.chatescrow.backend.service;

import com.chatescrow.backend.exception.ResourceNotFoundException;
import com.chatescrow.backend.model.Milestone;
import com.chatescrow.backend.model.Payment;
import com.chatescrow.backend.paypal.PayPalService;
import com.chatescrow.backend.repository.MilestoneRepository;
import com.chatescrow.backend.repository.PaymentRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
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
    private final MilestoneRepository milestoneRepo;
    private final PayPalService paypalService;
    private final ProjectService projectService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Creates a PayPal order on the backend with server-validated amount looked up from the milestone.
     * The stored milestone amount is always used to prevent client-side tampering.
     */
    @Transactional
    public Map<String, Object> createOrder(String projectId, String milestoneId, String currency) {
        String resolvedProjectId = projectService.resolveProjectId(projectId);
        projectService.getProject(resolvedProjectId); // validate project exists

        Milestone milestone = milestoneRepo.findById(milestoneId)
                .orElseThrow(() -> new ResourceNotFoundException("Milestone not found: " + milestoneId));

        if (!resolvedProjectId.equals(milestone.getProjectId())) {
            throw new IllegalArgumentException("Milestone " + milestoneId + " does not belong to project " + resolvedProjectId);
        }

        BigDecimal amount = milestone.getAmount();
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Milestone has no valid amount configured: " + amount);
        }

        if (!paypalService.isConfigured()) {
            return Map.of(
                "configurationRequired", true,
                "message", "PayPal credentials not configured. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in environment variables.",
                "sandbox", true
            );
        }

        String effectiveCurrency = (currency != null && !currency.isBlank())
                ? currency : (milestone.getCurrency() != null ? milestone.getCurrency() : "USD");

        Payment payment = Payment.builder()
                .projectId(resolvedProjectId)
                .milestoneId(milestoneId)
                .amount(amount)
                .currency(effectiveCurrency)
                .provider("PAYPAL")
                .status(Payment.PaymentStatus.ORDER_CREATED)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        try {
            PayPalService.PayPalOrderResult result = paypalService.createOrder(
                    amount, effectiveCurrency,
                    "ChatEscrow milestone payment - " + milestone.getTitle() + " (Project " + resolvedProjectId + ")");

            payment.setProviderOrderId(result.orderId());
            payment.setStatus(Payment.PaymentStatus.APPROVAL_PENDING);
            payment = paymentRepo.save(payment);

            ObjectNode meta = objectMapper.createObjectNode();
            meta.put("orderId", result.orderId());
            meta.put("milestoneId", milestoneId);
            meta.put("amount", amount);
            projectService.audit(resolvedProjectId, "system", "System",
                    "PAYPAL_ORDER_CREATED", "Payment", payment.getId(), meta.toString());

            return Map.of(
                "paymentId", payment.getId(),
                "orderId", result.orderId(),
                "approveUrl", result.approveUrl() != null ? result.approveUrl() : "",
                "status", "APPROVAL_PENDING",
                "amount", amount,
                "currency", effectiveCurrency,
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
     * Rejects unknown order IDs (no automatic dummy records).
     * Compares captured amount against the milestone's expected amount.
     */
    @Transactional
    public Map<String, Object> captureOrder(String orderId) {
        if (orderId == null || orderId.isBlank()) {
            throw new IllegalArgumentException("Order ID cannot be empty");
        }

        Payment payment = paymentRepo.findByProviderOrderId(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("No payment found for PayPal order ID: " + orderId + ". Orders must be initiated through ChatEscrow."));

        if (payment.getStatus() == Payment.PaymentStatus.CAPTURED) {
            return Map.of(
                    "status", "CAPTURED",
                    "alreadyCaptured", true,
                    "paymentId", payment.getId(),
                    "orderId", orderId,
                    "captureId", payment.getProviderCaptureId() != null ? payment.getProviderCaptureId() : ""
            );
        }

        payment.setStatus(Payment.PaymentStatus.CAPTURE_PENDING);
        paymentRepo.save(payment);

        PayPalService.PayPalCaptureResult result = paypalService.captureOrder(orderId);

        if ("COMPLETED".equalsIgnoreCase(result.status())) {
            // Verify captured amount against expected milestone amount
            if (payment.getAmount() != null && result.amount() != null
                    && payment.getAmount().compareTo(result.amount()) != 0) {
                log.warn("Captured amount mismatch for order {}: expected={}, captured={}",
                        orderId, payment.getAmount(), result.amount());
                payment.setStatus(Payment.PaymentStatus.UNKNOWN);
            } else {
                payment.setStatus(Payment.PaymentStatus.CAPTURED);
                payment.setProviderCaptureId(result.captureId());
                payment.setVerifiedAt(Instant.now());
            }

            payment.setUpdatedAt(Instant.now());
            paymentRepo.save(payment);

            ObjectNode meta = objectMapper.createObjectNode();
            meta.put("captureId", result.captureId());
            meta.put("amount", result.amount() != null ? result.amount().toPlainString() : payment.getAmount().toPlainString());
            meta.put("status", payment.getStatus().name());

            projectService.audit(payment.getProjectId(), "system", "System",
                    "PAYMENT_CAPTURED", "Payment", payment.getId(), meta.toString());
        } else {
            payment.setStatus(Payment.PaymentStatus.FAILED);
            payment.setUpdatedAt(Instant.now());
            paymentRepo.save(payment);
            log.warn("PayPal capture returned non-completed status {} for order {}", result.status(), orderId);
        }

        return Map.of(
            "paymentId", payment.getId(),
            "orderId", orderId,
            "captureId", result.captureId() != null ? result.captureId() : "",
            "status", payment.getStatus().name(),
            "providerStatus", result.status(),
            "sandbox", true
        );
    }

    @Transactional
    public Payment recordDemoPayment(String projectId, String milestoneId, BigDecimal amount, String currency) {
        String resolvedProjectId = projectService.resolveProjectId(projectId);
        projectService.getProject(resolvedProjectId);

        if (milestoneId != null && !milestoneId.isBlank()) {
            Milestone m = milestoneRepo.findById(milestoneId)
                    .orElseThrow(() -> new ResourceNotFoundException("Milestone not found: " + milestoneId));
            if (amount == null && m.getAmount() != null) {
                amount = m.getAmount();
            }
        }

        BigDecimal effectiveAmount = amount != null ? amount : new BigDecimal("400");
        String effectiveCurrency = currency != null ? currency : "USD";

        Payment payment = Payment.builder()
                .projectId(resolvedProjectId)
                .milestoneId(milestoneId)
                .amount(effectiveAmount)
                .currency(effectiveCurrency)
                .provider("DEMO_ESCROW")
                .providerOrderId("DEMO-ESCROW-" + System.currentTimeMillis())
                .providerCaptureId("DEMO-CAP-" + System.currentTimeMillis())
                .status(Payment.PaymentStatus.CAPTURED)
                .verifiedAt(Instant.now())
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        payment = paymentRepo.save(payment);

        ObjectNode meta = objectMapper.createObjectNode();
        meta.put("amount", effectiveAmount);
        meta.put("currency", effectiveCurrency);
        meta.put("provider", "DEMO_ESCROW");
        meta.put("mode", "SIMULATED_DEPOSIT");

        projectService.audit(resolvedProjectId, "client", "Sarah Miller (Demo)",
                "DEMO_ESCROW_DEPOSITED", "Payment", payment.getId(), meta.toString());
        log.info("Recorded simulated deposit payment {} for project {}", payment.getId(), resolvedProjectId);
        return payment;
    }

    @Transactional
    public Payment refundPayment(String paymentId, String reason) {
        Payment payment = getPayment(paymentId);
        payment.setStatus(Payment.PaymentStatus.CANCELLED);
        payment.setUpdatedAt(Instant.now());
        payment = paymentRepo.save(payment);

        ObjectNode meta = objectMapper.createObjectNode();
        meta.put("amount", payment.getAmount());
        meta.put("reason", reason != null ? reason : "Mutual resolution refund");

        projectService.audit(payment.getProjectId(), "client", "Client",
                "ESCROW_REFUND_PROCESSED", "Payment", payment.getId(), meta.toString());
        return payment;
    }

    public List<Payment> getProjectPayments(String projectId) {
        String resolvedProjectId = projectService.resolveProjectId(projectId);
        projectService.getProject(resolvedProjectId);
        return paymentRepo.findByProjectId(resolvedProjectId);
    }

    public Payment getPayment(String paymentId) {
        return paymentRepo.findById(paymentId)
                .orElseThrow(() -> new ResourceNotFoundException("Payment not found: " + paymentId));
    }

    public boolean isPaypalConfigured() {
        return paypalService.isConfigured();
    }
}
