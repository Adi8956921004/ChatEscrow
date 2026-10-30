package com.chatescrow.backend.exception;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Translates service-layer exceptions into structured JSON error responses.
 * Prevents raw stack traces and internal provider details from leaking to clients.
 * PayPal capture errors are surfaced as 422/502/504 with safe trimmed messages.
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNotFound(ResourceNotFoundException ex) {
        return errorBody(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    @ExceptionHandler(ForbiddenException.class)
    public ResponseEntity<Map<String, Object>> handleForbidden(ForbiddenException ex) {
        return errorBody(HttpStatus.FORBIDDEN, ex.getMessage());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleBadRequest(IllegalArgumentException ex) {
        return errorBody(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    @ExceptionHandler(org.springframework.web.bind.MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidationException(org.springframework.web.bind.MethodArgumentNotValidException ex) {
        String msg = ex.getBindingResult().getFieldErrors().stream()
                .map(err -> err.getField() + ": " + err.getDefaultMessage())
                .reduce((a, b) -> a + ", " + b)
                .orElse("Validation failed");
        return errorBody(HttpStatus.BAD_REQUEST, msg);
    }

    /**
     * Illegal state: e.g. "payment not captured" or "milestone not accepted".
     * Maps to 409 Conflict rather than 500 so clients can react meaningfully.
     */
    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, Object>> handleConflict(IllegalStateException ex) {
        String msg = (ex.getMessage() != null && !ex.getMessage().isBlank())
                ? ex.getMessage()
                : "The requested operation cannot be performed in the current resource state.";
        log.warn("Illegal state conflict: {}", msg);
        return errorBody(HttpStatus.CONFLICT, msg);
    }

    /**
     * Network timeout during PayPal capture. The outcome is UNKNOWN — the payment
     * is already persisted as UNKNOWN. Return 504 so the frontend can show
     * "reconcile needed" rather than "failed".
     */
    @ExceptionHandler(PayPalCaptureTimeoutException.class)
    public ResponseEntity<Map<String, Object>> handleCaptureTimeout(PayPalCaptureTimeoutException ex) {
        log.warn("PayPal capture timeout: {}", ex.getMessage());
        return errorBody(HttpStatus.GATEWAY_TIMEOUT,
                "The capture request timed out. Your payment status is UNKNOWN — " +
                "please check PayPal Sandbox and reconcile manually.");
    }

    /**
     * Structured PayPal API exception containing status code and raw response body.
     */
    @ExceptionHandler(PayPalApiException.class)
    public ResponseEntity<Map<String, Object>> handlePayPalApiException(PayPalApiException ex) {
        if (ex.getDebugId() != null && !ex.getDebugId().isBlank()) {
            log.error("PayPal debug_id: {}", ex.getDebugId());
        }
        log.error("PayPal API error {} — raw body: {}", ex.getStatusCode(), ex.getRawResponseBody());
        String safeMessage = extractSafePayPalMessage(ex.getRawResponseBody(), ex.getStatusCode());
        HttpStatus status = (ex.getStatusCode() >= 400 && ex.getStatusCode() < 500)
                ? HttpStatus.UNPROCESSABLE_ENTITY
                : HttpStatus.BAD_GATEWAY;
        return errorBody(status, safeMessage);
    }

    /**
     * Handles WebClientResponseException when PayPal returns an HTTP error status directly.
     */
    @ExceptionHandler(WebClientResponseException.class)
    public ResponseEntity<Map<String, Object>> handleWebClientResponse(WebClientResponseException wcEx) {
        String rawBody = wcEx.getResponseBodyAsString();
        log.error("PayPal upstream error {} — debug body: {}", wcEx.getStatusCode(), rawBody);
        String safeMessage = extractSafePayPalMessage(rawBody, wcEx.getStatusCode().value());
        HttpStatus status = wcEx.getStatusCode().is4xxClientError()
                ? HttpStatus.UNPROCESSABLE_ENTITY
                : HttpStatus.BAD_GATEWAY;
        return errorBody(status, safeMessage);
    }

    /**
     * Catches RuntimeExceptions. If the exception or cause relates to PayPal upstream
     * errors, it maps them to 422 or 502 with trimmed safe messages, preventing 500s.
     */
    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, Object>> handleRuntime(RuntimeException ex) {
        if (ex instanceof PayPalApiException apiEx) {
            return handlePayPalApiException(apiEx);
        }
        if (ex.getCause() instanceof PayPalApiException apiEx) {
            return handlePayPalApiException(apiEx);
        }
        if (ex instanceof WebClientResponseException wcEx) {
            return handleWebClientResponse(wcEx);
        }
        if (ex.getCause() instanceof WebClientResponseException wcEx) {
            return handleWebClientResponse(wcEx);
        }

        String message = ex.getMessage();
        if (message != null) {
            // Check for mocked PayPal 422 errors or decline messages
            if (message.contains("422") || message.contains("INSTRUMENT_DECLINED") || message.contains("UNPROCESSABLE_ENTITY")) {
                log.error("PayPal client error in RuntimeException: {}", message);
                String safeMessage = extractSafePayPalMessage(message, 422);
                return errorBody(HttpStatus.UNPROCESSABLE_ENTITY, safeMessage);
            }
            // Check for mocked PayPal 5xx or bad gateway errors
            if (message.contains("500") || message.contains("502") || message.contains("503") || message.contains("5xx")) {
                log.error("PayPal upstream error in RuntimeException: {}", message);
                String safeMessage = extractSafePayPalMessage(message, 502);
                return errorBody(HttpStatus.BAD_GATEWAY, safeMessage);
            }
        }

        log.error("Unhandled RuntimeException: {}", message, ex);
        return errorBody(HttpStatus.INTERNAL_SERVER_ERROR,
                message != null ? message : "Internal server error");
    }

    /**
     * Extracts a trimmed, client-safe message from a PayPal error body.
     * Logs debug_id server-side for correlation but never sends it to the client.
     */
    private String extractSafePayPalMessage(String rawBody, int httpStatus) {
        if (rawBody != null && !rawBody.isBlank()) {
            try {
                JsonNode node = objectMapper.readTree(rawBody);
                if (node.has("debug_id")) {
                    log.error("PayPal debug_id: {}", node.get("debug_id").asText());
                }

                // Check for detailed issues like INSTRUMENT_DECLINED
                if (node.has("details") && node.get("details").isArray() && !node.get("details").isEmpty()) {
                    JsonNode detail = node.get("details").get(0);
                    String issue = detail.path("issue").asText("");
                    String description = detail.path("description").asText("");
                    if (!issue.isBlank() && !description.isBlank()) {
                        return "PayPal declined: " + issue + " — " + description;
                    } else if (!issue.isBlank()) {
                        return "PayPal declined: " + issue;
                    }
                }

                String name = node.path("name").asText("");
                String message = node.path("message").asText("");
                if (!name.isBlank() && !message.isBlank()) {
                    return "PayPal declined: " + name + " — " + message;
                }
                if (!message.isBlank()) return "PayPal error: " + message;
                if (!name.isBlank()) return "PayPal error: " + name;
            } catch (Exception ignored) {
                // Not JSON - check for keywords in string message
                if (rawBody.contains("INSTRUMENT_DECLINED")) {
                    return "PayPal declined: INSTRUMENT_DECLINED — The instrument presented was declined.";
                }
                if (rawBody.contains("TRANSACTION_REFUSED")) {
                    return "PayPal declined: TRANSACTION_REFUSED — The transaction was refused by PayPal.";
                }
            }
        }

        if (httpStatus >= 500) {
            return "PayPal service unavailable (HTTP " + httpStatus + "). Check server logs for details.";
        }
        return "PayPal returned an error (HTTP " + httpStatus + "). Check server logs for details.";
    }

    private ResponseEntity<Map<String, Object>> errorBody(HttpStatus status, String message) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", status.value());
        body.put("error", status.getReasonPhrase());
        body.put("message", message);
        body.put("timestamp", Instant.now().toString());
        return ResponseEntity.status(status).body(body);
    }
}
