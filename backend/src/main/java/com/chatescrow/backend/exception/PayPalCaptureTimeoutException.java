package com.chatescrow.backend.exception;

/**
 * Thrown when the PayPal capture call times out or the connection is lost
 * before a response is received. The capture may or may not have succeeded
 * on PayPal's side, so the payment must be left in UNKNOWN state pending
 * reconciliation — it must never be marked FAILED.
 */
public class PayPalCaptureTimeoutException extends RuntimeException {
    public PayPalCaptureTimeoutException(String orderId, Throwable cause) {
        super("PayPal capture timed out for order " + orderId
                + " — payment state is UNKNOWN; reconcile via PayPal dashboard.", cause);
    }
}
