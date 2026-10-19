package com.chatescrow.backend.controller;

import com.chatescrow.backend.model.Payment;
import com.chatescrow.backend.model.WebhookEvent;
import com.chatescrow.backend.repository.PaymentRepository;
import com.chatescrow.backend.repository.WebhookEventRepository;
import com.chatescrow.backend.paypal.PayPalService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
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

        // Step 2: Extract event metadata from payload
        String eventType = "UNKNOWN";
        String eventId = null;
        JsonNode payloadNode = null;
        try {
            payloadNode = objectMapper.readTree(rawPayload);
            eventType = payloadNode.path("event_type").asText("UNKNOWN");
            eventId = payloadNode.path("id").asText(null);
        } catch (Exception ignored) {}

        // Step 3: Deduplicate on event ID
        String stableId = eventId != null ? eventId : (transmissionId != null ? transmissionId : "evt-" + Instant.now().toEpochMilli());
        if (webhookRepo.findByProviderEventId(stableId).isPresent()) {
            log.warn("Duplicate webhook event ignored (eventId={})", stableId);
            return ResponseEntity.ok(Map.of("status", "duplicate_ignored"));
        }

        // Step 4: Handle payment state updates for VERIFIED events
        String processingResult = "STORED_UNVERIFIED";
        if (status == WebhookEvent.VerificationStatus.VERIFIED) {
            processingResult = "PROCESSED_VERIFIED";
            log.info("Webhook event verified successfully: type={}, eventId={}", eventType, stableId);

            if (payloadNode != null) {
                try {
                    handlePaymentWebhookEvent(eventType, payloadNode);
                } catch (Exception ex) {
                    log.error("Failed to update payment state for webhook {}: {}", stableId, ex.getMessage());
                }
            }
        } else if (status == WebhookEvent.VerificationStatus.FAILED) {
            log.warn("Webhook signature verification FAILED: type={}, transmissionId={} — stored for audit only", eventType, transmissionId);
            processingResult = "STORED_VERIFICATION_FAILED";
        } else {
            log.info("Webhook stored without verification (PayPal not configured): type={}, eventId={}", eventType, stableId);
        }

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
            webhookRepo.save(event);
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
                payment.setStatus(Payment.PaymentStatus.CAPTURED);
                if (captureId != null) {
                    payment.setProviderCaptureId(captureId);
                }
                payment.setVerifiedAt(Instant.now());
                payment.setUpdatedAt(Instant.now());
                paymentRepo.save(payment);
                log.info("Payment {} updated to CAPTURED via webhook event {}", payment.getId(), eventType);
            } else if ("PAYMENT.CAPTURE.DENIED".equalsIgnoreCase(eventType)) {
                payment.setStatus(Payment.PaymentStatus.FAILED);
                payment.setUpdatedAt(Instant.now());
                paymentRepo.save(payment);
                log.info("Payment {} updated to FAILED via webhook event {}", payment.getId(), eventType);
            }
        }
    }

    @GetMapping("/events")
    public List<WebhookEvent> listEvents() {
        return webhookRepo.findAll();
    }

    @PostMapping("/simulate")
    public ResponseEntity<WebhookEvent> simulateWebhook(@RequestBody Map<String, String> body) {
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
