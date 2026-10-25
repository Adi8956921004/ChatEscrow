package com.chatescrow.backend.service;

import com.chatescrow.backend.exception.PayPalApiException;
import com.chatescrow.backend.exception.PayPalCaptureTimeoutException;
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

    // ── Order creation ─────────────────────────────────────────────────────

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

        if (!milestone.getProjectId().equals(resolvedProjectId)) {
            throw new IllegalArgumentException("Milestone does not belong to project: " + resolvedProjectId);
        }

        BigDecimal amount = milestone.getAmount();
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Milestone has no valid amount set: " + milestoneId);
        }

        String effectiveCurrency = (currency != null && !currency.isBlank())
                ? currency
                : (milestone.getCurrency() != null ? milestone.getCurrency() : "USD");

        Payment payment = Payment.builder()
                .projectId(resolvedProjectId)
                .milestoneId(milestoneId)
                .amount(amount)
                .currency(effectiveCurrency)
                .provider("PAYPAL")
                .status(Payment.PaymentStatus.APPROVAL_PENDING)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        payment = paymentRepo.save(payment);

        try {
            PayPalService.PayPalOrderResult result =
                    paypalService.createOrder(amount, effectiveCurrency, milestone.getTitle());

            payment.setProviderOrderId(result.orderId());
            payment.setUpdatedAt(Instant.now());
            paymentRepo.save(payment);

            log.info("Created PayPal order {} for payment {} milestone {}",
                    result.orderId(), payment.getId(), milestoneId);

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

    // ── Capture ────────────────────────────────────────────────────────────

    /**
     * Captures a PayPal order after user approves it via PayPal UI.
     *
     * Transaction strategy:
     *   - noRollbackFor is strictly narrowed to the two PayPal-specific exceptions
     *     (PayPalCaptureTimeoutException and PayPalApiException).
     *   - Statuses (UNKNOWN or FAILED) are saved directly and committed because
     *     those exceptions will not trigger a rollback.
     *   - Any other unexpected RuntimeException will roll back the transaction.
     *
     * Amount comparison uses BigDecimal.compareTo (scale-agnostic) so that
     * equivalent values with different scales are treated as equal — preventing false mismatches.
     */
    @Transactional(noRollbackFor = {PayPalCaptureTimeoutException.class, PayPalApiException.class})
    public Map<String, Object> captureOrder(String orderId) {
        if (orderId == null || orderId.isBlank()) {
            throw new IllegalArgumentException("Order ID cannot be empty");
        }

        Payment payment = paymentRepo.findByProviderOrderId(orderId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No payment found for PayPal order ID: " + orderId + ". Orders must be initiated through ChatEscrow."));

        if (payment.getStatus() == Payment.PaymentStatus.CAPTURED) {
            return Map.of(
                    "status", "CAPTURED",
                    "alreadyCaptured", true,
                    "paymentId", payment.getId(),
                    "orderId", orderId,
                    "captureId", payment.getProviderCaptureId() != null ? payment.getProviderCaptureId() : ""
            );
        }

        // Mark CAPTURE_PENDING so concurrent calls don't double-capture.
        payment.setStatus(Payment.PaymentStatus.CAPTURE_PENDING);
        payment.setUpdatedAt(Instant.now());
        paymentRepo.saveAndFlush(payment);

        PayPalService.PayPalCaptureResult result;
        try {
            result = paypalService.captureOrder(orderId);
        } catch (PayPalCaptureTimeoutException e) {
            // Outcome is indeterminate — persist UNKNOWN
            log.warn("Capture timed out for order {} — persisting UNKNOWN for reconciliation", orderId);
            payment.setStatus(Payment.PaymentStatus.UNKNOWN);
            payment.setUpdatedAt(Instant.now());
            paymentRepo.saveAndFlush(payment);
            throw e; // GlobalExceptionHandler → 504
        } catch (PayPalApiException e) {
            log.warn("Capture PayPal API error {} for order {} [debug_id={}] — marking FAILED",
                    e.getStatusCode(), orderId, e.getDebugId());
            payment.setStatus(Payment.PaymentStatus.FAILED);
            payment.setUpdatedAt(Instant.now());
            paymentRepo.saveAndFlush(payment);
            throw e; // GlobalExceptionHandler → 422/502
        }

        return applyCapture(payment, orderId, result, "captureOrder");
    }

    /**
     * Re-checks an UNKNOWN payment by calling GET /v2/checkout/orders/{id}.
     * Handles the ORDER_ALREADY_CAPTURED case after a timeout: if PayPal
     * shows COMPLETED, apply the same amount/currency check and settle.
     */
    @Transactional(noRollbackFor = {PayPalCaptureTimeoutException.class, PayPalApiException.class})
    public Map<String, Object> recheckPayment(String orderId) {
        Payment payment = paymentRepo.findByProviderOrderId(orderId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No payment found for PayPal order ID: " + orderId));

        if (payment.getStatus() == Payment.PaymentStatus.CAPTURED) {
            return Map.of(
                    "status", "CAPTURED",
                    "alreadyCaptured", true,
                    "paymentId", payment.getId(),
                    "orderId", orderId,
                    "captureId", payment.getProviderCaptureId() != null ? payment.getProviderCaptureId() : ""
            );
        }

        PayPalService.PayPalCaptureResult result;
        try {
            result = paypalService.recheckOrder(orderId);
        } catch (PayPalCaptureTimeoutException e) {
            log.warn("Recheck PayPal timeout for order {}", orderId);
            throw e;
        } catch (PayPalApiException e) {
            log.warn("Recheck PayPal API error {} for order {} [debug_id={}]",
                    e.getStatusCode(), orderId, e.getDebugId());
            throw e;
        }

        return applyCapture(payment, orderId, result, "recheckPayment");
    }

    /**
     * Shared post-capture evaluation: checks status, validates amount/currency,
     * persists final state, fires audit, and builds the response map.
     *
     * Amount comparison uses BigDecimal.compareTo (scale-agnostic) so that
     * equivalent values with different decimal scales are treated as equal.
     */
    private Map<String, Object> applyCapture(Payment payment, String orderId,
                                              PayPalService.PayPalCaptureResult result, String caller) {

        if ("COMPLETED".equalsIgnoreCase(result.status())) {
            // Resolve expected amount and currency from the milestone (authoritative source).
            Milestone milestone = (payment.getMilestoneId() != null)
                    ? milestoneRepo.findById(payment.getMilestoneId()).orElse(null)
                    : null;
            BigDecimal expectedAmount = (milestone != null && milestone.getAmount() != null)
                    ? milestone.getAmount() : payment.getAmount();
            String expectedCurrency = (milestone != null && milestone.getCurrency() != null
                    && !milestone.getCurrency().isBlank())
                    ? milestone.getCurrency() : payment.getCurrency();
            if (expectedCurrency == null || expectedCurrency.isBlank()) expectedCurrency = "USD";

            // compareTo is scale-agnostic (e.g. 50.0.compareTo(50.00) == 0).
            boolean amountMatches = expectedAmount != null && result.amount() != null
                    && expectedAmount.compareTo(result.amount()) == 0;
            boolean currencyMatches = result.currency() == null
                    || expectedCurrency.equalsIgnoreCase(result.currency());

            if (!amountMatches || !currencyMatches) {
                log.warn("{}: amount/currency mismatch for order {}: expected {} {}, captured {} {}",
                        caller, orderId, expectedAmount, expectedCurrency, result.amount(), result.currency());

                // Store the real captured values so reconciliation / refund is possible.
                payment.setStatus(Payment.PaymentStatus.UNKNOWN);
                payment.setUpdatedAt(Instant.now());
                if (result.captureId() != null) payment.setProviderCaptureId(result.captureId());
                if (result.amount() != null) payment.setCapturedAmount(result.amount());
                if (result.currency() != null) payment.setCapturedCurrency(result.currency());
                paymentRepo.saveAndFlush(payment);

                projectService.audit(payment.getProjectId(), "system", "System",
                        "PAYMENT_VERIFICATION_MISMATCH", "Payment", payment.getId(),
                        buildMismatchMeta(result, expectedAmount, expectedCurrency));

                return Map.of(
                        "paymentId", payment.getId(),
                        "orderId", orderId,
                        "captureId", result.captureId() != null ? result.captureId() : "",
                        "capturedAmount", result.amount() != null ? result.amount().toPlainString() : "",
                        "capturedCurrency", result.currency() != null ? result.currency() : "",
                        "status", "UNKNOWN",
                        "providerStatus", result.status(),
                        "mismatch", true,
                        "sandbox", true
                );
            }

            // Amount and currency both match — mark CAPTURED.
            payment.setStatus(Payment.PaymentStatus.CAPTURED);
            payment.setUpdatedAt(Instant.now());
            if (result.captureId() != null) {
                payment.setProviderCaptureId(result.captureId());
                payment.setVerifiedAt(Instant.now());
            }
            if (result.amount() != null) payment.setCapturedAmount(result.amount());
            if (result.currency() != null) payment.setCapturedCurrency(result.currency());
            paymentRepo.saveAndFlush(payment);

            projectService.audit(payment.getProjectId(), "system", "System",
                    "PAYMENT_CAPTURED", "Payment", payment.getId(),
                    buildCaptureMeta(result));

            return Map.of(
                    "paymentId", payment.getId(),
                    "orderId", orderId,
                    "captureId", result.captureId() != null ? result.captureId() : "",
                    "status", "CAPTURED",
                    "providerStatus", result.status(),
                    "sandbox", true
            );
        } else {
            // PayPal returned a non-COMPLETED status — treat as FAILED.
            log.warn("{}: PayPal returned non-COMPLETED status {} for order {}", caller, result.status(), orderId);
            payment.setStatus(Payment.PaymentStatus.FAILED);
            payment.setUpdatedAt(Instant.now());
            paymentRepo.saveAndFlush(payment);

            return Map.of(
                    "paymentId", payment.getId(),
                    "orderId", orderId,
                    "captureId", result.captureId() != null ? result.captureId() : "",
                    "status", "FAILED",
                    "providerStatus", result.status(),
                    "sandbox", true
            );
        }
    }

    private String buildCaptureMeta(PayPalService.PayPalCaptureResult result) {
        ObjectNode meta = objectMapper.createObjectNode();
        meta.put("captureId", result.captureId() != null ? result.captureId() : "");
        meta.put("amount", result.amount() != null ? result.amount().toPlainString() : "");
        meta.put("currency", result.currency() != null ? result.currency() : "");
        meta.put("status", "CAPTURED");
        return meta.toString();
    }

    private String buildMismatchMeta(PayPalService.PayPalCaptureResult result,
                                     BigDecimal expectedAmount, String expectedCurrency) {
        ObjectNode meta = objectMapper.createObjectNode();
        meta.put("captureId", result.captureId() != null ? result.captureId() : "");
        meta.put("capturedAmount", result.amount() != null ? result.amount().toPlainString() : "");
        meta.put("capturedCurrency", result.currency() != null ? result.currency() : "");
        meta.put("expectedAmount", expectedAmount != null ? expectedAmount.toPlainString() : "");
        meta.put("expectedCurrency", expectedCurrency != null ? expectedCurrency : "");
        meta.put("status", "UNKNOWN");
        meta.put("reason", "AMOUNT_CURRENCY_MISMATCH");
        return meta.toString();
    }

    // ── Demo & ancillary payments ──────────────────────────────────────────

    @Transactional
    public Payment recordDemoPayment(String projectId, String milestoneId) {
        return recordDemoPayment(projectId, milestoneId, null, null);
    }

    @Transactional
    public Payment recordDemoPayment(String projectId, String milestoneId, BigDecimal ignoredAmount, String ignoredCurrency) {
        String resolvedProjectId = projectService.resolveProjectId(projectId);
        projectService.getProject(resolvedProjectId);

        BigDecimal effectiveAmount;
        String effectiveCurrency;

        if (milestoneId != null && !milestoneId.isBlank()) {
            // Always use the milestone's stored amount/currency — ignore whatever the client sent in the body.
            Milestone m = milestoneRepo.findById(milestoneId)
                    .orElseThrow(() -> new ResourceNotFoundException("Milestone not found: " + milestoneId));
            effectiveAmount = m.getAmount();
            effectiveCurrency = (m.getCurrency() != null && !m.getCurrency().isBlank()) ? m.getCurrency() : "USD";
        } else {
            // No milestoneId supplied — this path should not normally be reached for demo deposits.
            throw new IllegalArgumentException("Milestone ID is required for a demo deposit");
        }

        if (effectiveAmount == null || effectiveAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Milestone has no valid amount set — cannot record demo deposit");
        }

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
