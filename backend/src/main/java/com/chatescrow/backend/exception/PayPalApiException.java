package com.chatescrow.backend.exception;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Getter;

@Getter
public class PayPalApiException extends RuntimeException {
    private final int statusCode;
    private final String rawResponseBody;
    private final String debugId;
    private final String errorName;
    private final String errorDescription;

    private static final ObjectMapper MAPPER = new ObjectMapper();

    public PayPalApiException(int statusCode, String rawResponseBody) {
        this(statusCode, rawResponseBody, null);
    }

    public PayPalApiException(int statusCode, String rawResponseBody, Throwable cause) {
        super(formatMessage(statusCode, rawResponseBody), cause);
        this.statusCode = statusCode;
        this.rawResponseBody = rawResponseBody;

        String parsedDebugId = null;
        String parsedName = null;
        String parsedDesc = null;

        if (rawResponseBody != null && !rawResponseBody.isBlank()) {
            try {
                JsonNode node = MAPPER.readTree(rawResponseBody);
                if (node.has("debug_id")) {
                    parsedDebugId = node.path("debug_id").asText(null);
                }
                if (node.has("name")) {
                    parsedName = node.path("name").asText(null);
                }
                if (node.has("message")) {
                    parsedDesc = node.path("message").asText(null);
                }
                if (node.has("details") && node.get("details").isArray() && !node.get("details").isEmpty()) {
                    JsonNode detail = node.get("details").get(0);
                    if (detail.has("issue")) {
                        parsedName = detail.path("issue").asText(parsedName);
                    }
                    if (detail.has("description")) {
                        parsedDesc = detail.path("description").asText(parsedDesc);
                    }
                }
            } catch (Exception ignored) {}
        }

        this.debugId = parsedDebugId;
        this.errorName = parsedName;
        this.errorDescription = parsedDesc;
    }

    private static String formatMessage(int statusCode, String rawResponseBody) {
        if (rawResponseBody == null || rawResponseBody.isBlank()) {
            return "PayPal API error (HTTP " + statusCode + ")";
        }
        return "PayPal API error (HTTP " + statusCode + "): " + rawResponseBody;
    }
}
