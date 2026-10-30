package com.chatescrow.backend.controller;

import com.chatescrow.backend.model.Payment;
import com.chatescrow.backend.model.WebhookEvent;
import com.chatescrow.backend.repository.PaymentRepository;
import com.chatescrow.backend.repository.WebhookEventRepository;
import com.chatescrow.backend.paypal.PayPalService;
import com.chatescrow.backend.security.SecurityService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * PayPal Webhook receiver.
 * Verifies webhook signatures using the official PayPal verification API.
 * Updates payment states on verified capture completion/denial idempotently.
 * Catches race conditions on deduplication.
 */
@RestController
@RequestMapping("/api/webhooks")
@Slf4j
@RequiredArgsConstructor
public class WebhookController {

    private final WebhookEventRepository webhookRepo;
    private final PayPalService paypalService;
    private final PaymentRepository paymentRepo;
    private final SecurityService securityService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @PostMapping("/paypal")
    public ResponseEntity<Map<String, String>> receiveWebhook(
            @RequestHeader(value = "PAYPAL-AUTH-ALGO", required = false) String authAlgo,
            @RequestHeader(value = "PAYPAL-CERT-URL", required = false) String certUrl,
            @RequestHeader(value = "PAYPAL-TRANSMISSION-ID", required = false) String transmissionId,
            @RequestHeader(value = "PAYPAL-TRANSMISSION-SIG", required = false) String transmissionSig,
            @RequestHeader(value = "PAYPAL-TRANSMISSION-TIME", required = false) String transmissionTime,
            @RequestBody String rawPayload) {

        log.info("Received PayPal webhook: transmissionId={}, time={}", transmissionId, transmissionTime);

        // Step 1: Verify signature BEFORE deduplication to prevent forged-ID attacks
        WebhookEvent.VerificationStatus status = WebhookEvent.VerificationStatus.SKIPPED;
        if (transmissionId != null && transmissionSig != null && paypalService.isConfigured()) {
            boolean verified = paypalService.verifyWebhookSignature(
                    authAlgo, certUrl, transmissionId, transmissionSig, transmissionTime, null, rawPayload);
            status = verified ? WebhookEvent.VerificationStatus.VERIFIED : WebhookEvent.VerificationStatus.FAILED;
        }

        // If signature verification explicitly failed, reject immediately (do not store or process forged event)
        if (status == WebhookEvent.VerificationStatus.FAILED) {
            log.warn("Webhook signature verification FAILED for transmissionId={} — request rejected", transmissionId);
            return ResponseEntity.badRequest().body(Map.of(
                    "status", "rejected",
                    "reason", "signature_verification_failed"
            ));
        }

        // Step 2: Extract event metadata from payload
        String eventType = "UNKNOWN";
        String eventId = null;
        JsonNode payloadNode = null;
        try {
            payloadNode = objectMapper.readTree(rawPayload);
            eventType = payloadNode.path("event_type").asText("UNKNOWN");
            eventId = payloadNode.path("id").asText(null);
        } catch (Exception ignored) {}

        // Step 3: Deduplicate on event ID and claim first via database constraint
        String stableId = eventId != null ? eventId : (transmissionId != null ? transmissionId : "evt-" + Instant.now().toEpochMilli());
        if (webhookRepo.findByProviderEventId(stableId).isPresent()) {
            log.warn("Duplicate webhook event ignored (eventId={})", stableId);
            return ResponseEntity.ok(Map.of("status", "duplicate_ignored"));
        }

        // Step 4: Handle payment state updates for VERIFIED events first
        String processingResult = "STORED_UNVERIFIED";
        if (status == WebhookEvent.VerificationStatus.VERIFIED) {
            log.info("Webhook event verified successfully: type={}, eventId={}", eventType, stableId);
            if (payloadNode != null) {
                try {
                    handlePaymentWebhookEvent(eventType, payloadNode);
                    processingResult = "PROCESSED_VERIFIED";
                } catch (Exception ex) {
                    log.error("Failed to update payment state for webhook {}: {}", stableId, ex.getMessage());
                    processingResult = "FAILED_PROCESSING: " + ex.getMessage();
                }
            } else {
                processingResult = "PROCESSED_VERIFIED_NO_PAYLOAD";
            }
        }

        // Step 5: Persist event ID only after the work is done
        WebhookEvent event = WebhookEvent.builder()
                .providerEventId(stableId)
                .eventType(eventType)
                .verificationStatus(status)
                .rawPayload(rawPayload)
                .processedAt(Instant.now())
                .processingResult(processingResult)
                .createdAt(Instant.now())
                .build();

        try {
            webhookRepo.saveAndFlush(event);
        } catch (DataIntegrityViolationException ex) {
            log.warn("Concurrent duplicate webhook caught by unique constraint: {}", stableId);
            return ResponseEntity.ok(Map.of("status", "duplicate_ignored"));
        }

        return ResponseEntity.ok(Map.of(
                "status", "received",
                "verificationStatus", status.name(),
                "eventType", eventType
        ));
    }

    private void handlePaymentWebhookEvent(String eventType, JsonNode payloadNode) {
        JsonNode resource = payloadNode.path("resource");
        String captureId = resource.path("id").asText(null);
        String orderId = resource.path("supplementary_data").path("related_ids").path("order_id").asText(null);

        Optional<Payment> targetPayment = Optional.empty();
        if (captureId != null) {
            targetPayment = paymentRepo.findByProviderCaptureId(captureId);
        }
        if (targetPayment.isEmpty() && orderId != null) {
            targetPayment = paymentRepo.findByProviderOrderId(orderId);
        }

        if (targetPayment.isPresent()) {
            Payment payment = targetPayment.get();
            if ("PAYMENT.CAPTURE.COMPLETED".equalsIgnoreCase(eventType)) {
                if (payment.getStatus() == Payment.PaymentStatus.CAPTURED) {
                    return; // already settled
                }
                // Apply the same amount/currency check as the capture flow, so a webhook
                // cannot promote a payment that was parked as a mismatch.
                BigDecimal paid = parseAmount(resource.path("amount").path("value").asText(null));
                String paidCurrency = resource.path("amount").path("currency_code").asText(null);
                boolean amountOk = paid != null && payment.getAmount() != null
                        && payment.getAmount().compareTo(paid) == 0;
                boolean currencyOk = paidCurrency == null
                        || (payment.getCurrency() != null && payment.getCurrency().equalsIgnoreCase(paidCurrency));
                if (!amountOk || !currencyOk) {
                    log.warn("Webhook {} for payment {} has unexpected amount/currency ({} {}) — leaving status {}",
                            eventType, payment.getId(), paid, paidCurrency, payment.getStatus());
                    return;
                }
                payment.setStatus(Payment.PaymentStatus.CAPTURED);
                if (captureId != null) {
                    payment.setProviderCaptureId(captureId);
                }
                payment.setCapturedAmount(paid);
                if (paidCurrency != null) {
                    payment.setCapturedCurrency(paidCurrency);
                }
                payment.setVerifiedAt(Instant.now());
                payment.setUpdatedAt(Instant.now());
                paymentRepo.save(payment);
                log.info("Payment {} updated to CAPTURED via webhook event {}", payment.getId(), eventType);
            } else if ("PAYMENT.CAPTURE.DENIED".equalsIgnoreCase(eventType)) {
                if (payment.getStatus() == Payment.PaymentStatus.CAPTURED) {
                    log.warn("Ignoring {} for already captured payment {}", eventType, payment.getId());
                    return;
                }
                payment.setStatus(Payment.PaymentStatus.FAILED);
                payment.setUpdatedAt(Instant.now());
                paymentRepo.save(payment);
                log.info("Payment {} updated to FAILED via webhook event {}", payment.getId(), eventType);
            }
        }
    }

    private static BigDecimal parseAmount(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return new BigDecimal(value);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    @GetMapping("/events")
    public List<WebhookEvent> listEvents(HttpServletRequest request) {
        securityService.requireClient(request);
        return webhookRepo.findAll();
    }

    @PostMapping("/simulate")
    public ResponseEntity<WebhookEvent> simulateWebhook(@RequestBody Map<String, String> body,
                                                        HttpServletRequest request) {
        securityService.requireClient(request);
        String eventType = body.getOrDefault("eventType", "PAYMENT.CAPTURE.COMPLETED");
        String customId = "sim-evt-" + Instant.now().toEpochMilli();

        WebhookEvent event = WebhookEvent.builder()
                .providerEventId(customId)
                .eventType(eventType)
                .verificationStatus(WebhookEvent.VerificationStatus.SIMULATED)
                .rawPayload("{\"id\":\"" + customId + "\",\"event_type\":\"" + eventType + "\",\"summary\":\"Simulated Sandbox Webhook Event\",\"create_time\":\"" + Instant.now() + "\"}")
                .processedAt(Instant.now())
                .processingResult("SIMULATED")
                .createdAt(Instant.now())
                .build();
        webhookRepo.save(event);
        return ResponseEntity.ok(event);
    }
}
