package com.chatescrow.backend.controller;

import com.chatescrow.backend.model.WebhookEvent;
import com.chatescrow.backend.repository.WebhookEventRepository;
import com.chatescrow.backend.paypal.PayPalService;
import com.chatescrow.backend.repository.PaymentRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * PayPal Webhook receiver.
 * Verifies webhook signatures using the official PayPal verification API.
 * Duplicates are rejected; events without verified signatures are stored as FAILED/SKIPPED
 * and do not trigger financial actions.
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

        // Deduplication: reject duplicate events
        if (transmissionId != null && webhookRepo.findByProviderEventId(transmissionId).isPresent()) {
            log.warn("Duplicate webhook event ignored: {}", transmissionId);
            return ResponseEntity.ok(Map.of("status", "duplicate_ignored"));
        }

        String eventType = "UNKNOWN";
        try {
            JsonNode payloadNode = objectMapper.readTree(rawPayload);
            eventType = payloadNode.path("event_type").asText("UNKNOWN");
        } catch (Exception ignored) {}

        WebhookEvent.VerificationStatus status = WebhookEvent.VerificationStatus.SKIPPED;
        if (transmissionId != null && transmissionSig != null && paypalService.isConfigured()) {
            boolean verified = paypalService.verifyWebhookSignature(
                    authAlgo, certUrl, transmissionId, transmissionSig, transmissionTime, null, rawPayload);
            status = verified ? WebhookEvent.VerificationStatus.VERIFIED : WebhookEvent.VerificationStatus.FAILED;
        }

        String processingResult = "STORED";
        if (status == WebhookEvent.VerificationStatus.VERIFIED) {
            processingResult = "PROCESSED_VERIFIED";
            log.info("Webhook event verified successfully: type={}, id={}", eventType, transmissionId);
        } else {
            log.info("Webhook stored with status {}: type={}, id={}", status, eventType, transmissionId);
        }

        WebhookEvent event = WebhookEvent.builder()
                .providerEventId(transmissionId != null ? transmissionId : "evt-" + Instant.now().toEpochMilli())
                .eventType(eventType)
                .verificationStatus(status)
                .rawPayload(rawPayload)
                .processedAt(Instant.now())
                .processingResult(processingResult)
                .createdAt(Instant.now())
                .build();

        webhookRepo.save(event);

        return ResponseEntity.ok(Map.of(
                "status", "received",
                "verificationStatus", status.name(),
                "eventType", eventType
        ));
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
                .verificationStatus(WebhookEvent.VerificationStatus.VERIFIED)
                .rawPayload("{\"id\":\"" + customId + "\",\"event_type\":\"" + eventType + "\",\"summary\":\"Simulated Sandbox Webhook Event\",\"create_time\":\"" + Instant.now() + "\"}")
                .processedAt(Instant.now())
                .processingResult("SIMULATED_VERIFIED")
                .createdAt(Instant.now())
                .build();
        webhookRepo.save(event);
        return ResponseEntity.ok(event);
    }
}
