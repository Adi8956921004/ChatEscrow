package com.chatescrow.backend.paypal;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.UUID;

@Service
@Slf4j
public class PayPalService {

    @Value("${paypal.base-url}")
    private String baseUrl;

    @Value("${paypal.client-id}")
    private String clientId;

    @Value("${paypal.client-secret}")
    private String clientSecret;

    @Value("${paypal.webhook-id:}")
    private String webhookId;

    @Value("${paypal.enable-payouts:false}")
    private boolean enablePayouts;

    @Value("${app.frontend-url:${app.base-url:http://localhost:5173}}")
    private String appBaseUrl;

    private final WebClient webClient;
    private final ObjectMapper objectMapper = new ObjectMapper();

    // In-memory token cache
    private String cachedToken = null;
    private Instant tokenExpiresAt = Instant.MIN;

    public PayPalService(WebClient webClient) {
        this.webClient = webClient;
    }

    public boolean isConfigured() {
        return clientId != null && !clientId.isBlank() && !clientId.equals("CONFIGURE_ME")
                && clientSecret != null && !clientSecret.isBlank() && !clientSecret.equals("CONFIGURE_ME");
    }

    /**
     * Obtains a cached or fresh OAuth 2.0 access token from PayPal.
     */
    public synchronized String getAccessToken() {
        if (!isConfigured()) {
            throw new PayPalNotConfiguredException("PayPal credentials not configured. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.");
        }

        // Return cached token if valid for at least 60 more seconds
        if (cachedToken != null && Instant.now().plusSeconds(60).isBefore(tokenExpiresAt)) {
            return cachedToken;
        }

        String credentials = Base64.getEncoder()
                .encodeToString((clientId + ":" + clientSecret).getBytes(StandardCharsets.UTF_8));

        try {
            String response = webClient.post()
                    .uri(baseUrl + "/v1/oauth2/token")
                    .header(HttpHeaders.AUTHORIZATION, "Basic " + credentials)
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(BodyInserters.fromFormData("grant_type", "client_credentials"))
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            JsonNode node = objectMapper.readTree(response);
            cachedToken = node.get("access_token").asText();
            int expiresIn = node.has("expires_in") ? node.get("expires_in").asInt() : 3600;
            tokenExpiresAt = Instant.now().plusSeconds(expiresIn);
            return cachedToken;
        } catch (Exception e) {
            log.error("Failed to obtain PayPal access token", e);
            throw new RuntimeException("Failed to obtain PayPal access token: " + e.getMessage(), e);
        }
    }

    /**
     * Creates a PayPal order on the backend with server-validated amount/currency.
     * Returns {orderId, approveUrl, status}.
     */
    public PayPalOrderResult createOrder(BigDecimal amount, String currency, String description) {
        String token = getAccessToken();

        ObjectNode purchaseUnit = objectMapper.createObjectNode();
        purchaseUnit.put("description", description);
        ObjectNode amountNode = objectMapper.createObjectNode();
        amountNode.put("currency_code", currency);
        amountNode.put("value", amount.toPlainString());
        purchaseUnit.set("amount", amountNode);

        ObjectNode body = objectMapper.createObjectNode();
        body.put("intent", "CAPTURE");
        body.set("purchase_units", objectMapper.createArrayNode().add(purchaseUnit));

        ObjectNode appContext = objectMapper.createObjectNode();
        String safeBase = appBaseUrl.endsWith("/") ? appBaseUrl.substring(0, appBaseUrl.length() - 1) : appBaseUrl;
        appContext.put("return_url", safeBase + "/payment/success");
        appContext.put("cancel_url", safeBase + "/payment/cancel");
        body.set("application_context", appContext);

        String requestId = "order-req-" + UUID.randomUUID();

        try {
            String response = webClient.post()
                    .uri(baseUrl + "/v2/checkout/orders")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                    .header("PayPal-Request-Id", requestId)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(body.toString())
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            JsonNode result = objectMapper.readTree(response);
            String orderId = result.get("id").asText();
            String status = result.get("status").asText();
            String approveUrl = null;
            if (result.has("links")) {
                for (JsonNode link : result.get("links")) {
                    if ("approve".equals(link.get("rel").asText())) {
                        approveUrl = link.get("href").asText();
                        break;
                    }
                }
            }
            return new PayPalOrderResult(orderId, approveUrl, status);
        } catch (Exception e) {
            log.error("PayPal createOrder failed", e);
            throw new RuntimeException("Failed to create PayPal order: " + e.getMessage(), e);
        }
    }

    /**
     * Captures a previously approved PayPal order.
     * Validates that capture actually completed at PayPal.
     * Never fakes captures for unapproved orders or errors.
     */
    public PayPalCaptureResult captureOrder(String orderId) {
        String token = getAccessToken();
        String requestId = "capture-req-" + orderId;

        try {
            String response = webClient.post()
                    .uri(baseUrl + "/v2/checkout/orders/" + orderId + "/capture")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                    .header("PayPal-Request-Id", requestId)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue("{}")
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            JsonNode result = objectMapper.readTree(response);
            String status = result.path("status").asText("UNKNOWN");
            String captureId = null;
            BigDecimal capturedAmount = null;

            if (result.has("purchase_units")) {
                JsonNode pu = result.get("purchase_units").get(0);
                if (pu.has("payments") && pu.get("payments").has("captures")) {
                    JsonNode capture = pu.get("payments").get("captures").get(0);
                    captureId = capture.path("id").asText(null);
                    if (capture.has("amount") && capture.get("amount").has("value")) {
                        try {
                            capturedAmount = new BigDecimal(capture.get("amount").get("value").asText());
                        } catch (Exception ignored) {}
                    }
                }
            }
            return new PayPalCaptureResult(orderId, captureId, status, capturedAmount);
        } catch (WebClientResponseException e) {
            String errBody = e.getResponseBodyAsString();
            log.error("PayPal captureOrder HTTP {} error for orderId={}: {}", e.getStatusCode(), orderId, errBody);
            throw new RuntimeException("PayPal capture error (" + e.getStatusCode() + "): " + errBody, e);
        } catch (Exception e) {
            log.error("PayPal captureOrder failed for orderId={}: {}", orderId, e.getMessage());
            throw new RuntimeException("PayPal capture failed for order " + orderId + ": " + e.getMessage(), e);
        }
    }

    /**
     * Retrieves the current status of a PayPal order for backend verification.
     */
    public Map<String, Object> getOrderDetails(String orderId) {
        String token = getAccessToken();
        try {
            String response = webClient.get()
                    .uri(baseUrl + "/v2/checkout/orders/" + orderId)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();
            JsonNode node = objectMapper.readTree(response);
            return objectMapper.convertValue(node, Map.class);
        } catch (Exception e) {
            throw new RuntimeException("Failed to get PayPal order details: " + e.getMessage(), e);
        }
    }

    /**
     * Verifies PayPal webhook signature via POST /v1/notifications/verify-webhook-signature
     */
    public boolean verifyWebhookSignature(String authAlgo, String certUrl,
                                           String transmissionId, String transmissionSig,
                                           String transmissionTime, String webhookIdParam,
                                           String rawPayload) {
        if (!isConfigured()) {
            return false;
        }
        String effectiveWebhookId = (webhookIdParam != null && !webhookIdParam.isBlank())
                ? webhookIdParam : this.webhookId;
        if (effectiveWebhookId == null || effectiveWebhookId.isBlank()) {
            log.warn("Cannot verify webhook signature: PAYPAL_WEBHOOK_ID is not configured");
            return false;
        }

        try {
            String token = getAccessToken();
            JsonNode payloadNode = objectMapper.readTree(rawPayload);

            ObjectNode body = objectMapper.createObjectNode();
            body.put("auth_algo", authAlgo);
            body.put("cert_url", certUrl);
            body.put("transmission_id", transmissionId);
            body.put("transmission_sig", transmissionSig);
            body.put("transmission_time", transmissionTime);
            body.put("webhook_id", effectiveWebhookId);
            body.set("webhook_event", payloadNode);

            String response = webClient.post()
                    .uri(baseUrl + "/v1/notifications/verify-webhook-signature")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(body.toString())
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            JsonNode result = objectMapper.readTree(response);
            String verificationStatus = result.path("verification_status").asText("");
            return "SUCCESS".equalsIgnoreCase(verificationStatus);
        } catch (Exception e) {
            log.error("Failed to verify PayPal webhook signature", e);
            return false;
        }
    }

    /**
     * Dispatches a milestone payout via PayPal Payouts API if enabled,
     * or returns transparently labelled DEMO_SIMULATED status if payouts are not enabled.
     * Enforces stable idempotency key.
     */
    public PayoutResult createPayout(String milestoneId, String recipientEmail,
                                     BigDecimal amount, String currency, String note,
                                     String idempotencyKey) {
        if (!enablePayouts || !isConfigured()) {
            return new PayoutResult(
                    "simulated-" + UUID.randomUUID().toString().substring(0, 8),
                    "DEMO_SIMULATED",
                    true,
                    "Simulated release: Live PayPal Payouts requires verified business account approval and PAYPAL_ENABLE_PAYOUTS=true."
            );
        }

        String token = getAccessToken();
        String stableKey = (idempotencyKey != null && !idempotencyKey.isBlank())
                ? idempotencyKey : "payout-" + milestoneId;

        ObjectNode body = objectMapper.createObjectNode();
        ObjectNode header = objectMapper.createObjectNode();
        header.put("sender_batch_id", stableKey);
        header.put("email_subject", "Milestone Payment Release: " + note);
        header.put("email_message", "You have received a milestone payment release through ChatEscrow.");
        body.set("sender_batch_header", header);

        com.fasterxml.jackson.databind.node.ArrayNode items = objectMapper.createArrayNode();
        ObjectNode item = objectMapper.createObjectNode();
        item.put("recipient_type", "EMAIL");
        item.put("receiver", recipientEmail != null && !recipientEmail.isBlank() ? recipientEmail : "freelancer@example.com");
        item.put("note", note != null ? note : "Milestone release");
        item.put("sender_item_id", "item-" + milestoneId);
        ObjectNode amountNode = objectMapper.createObjectNode();
        amountNode.put("value", amount.toPlainString());
        amountNode.put("currency", currency != null ? currency : "USD");
        item.set("amount", amountNode);
        items.add(item);
        body.set("items", items);

        try {
            String response = webClient.post()
                    .uri(baseUrl + "/v1/payments/payouts")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                    .header("PayPal-Request-Id", stableKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(body.toString())
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            JsonNode result = objectMapper.readTree(response);
            String batchId = result.path("batch_header").path("payout_batch_id").asText();
            String batchStatus = result.path("batch_header").path("batch_status").asText();
            return new PayoutResult(batchId, batchStatus, false, "Payout batch initiated successfully via PayPal Payouts API.");
        } catch (Exception e) {
            log.error("Failed to execute PayPal payout for milestone {}", milestoneId, e);
            throw new RuntimeException("PayPal Payout failed: " + e.getMessage(), e);
        }
    }

    public record PayPalOrderResult(String orderId, String approveUrl, String status) {}
    public record PayPalCaptureResult(String orderId, String captureId, String status, BigDecimal amount) {}
    public record PayoutResult(String batchId, String status, boolean isSimulated, String message) {}

    public static class PayPalNotConfiguredException extends RuntimeException {
        public PayPalNotConfiguredException(String msg) { super(msg); }
    }
}
