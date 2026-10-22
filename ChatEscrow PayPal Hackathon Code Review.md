Check this first
PayPalService.captureOrder has its own catch that returns a SANDBOX-SIM-… result with COMPLETED on a 422 (and for CREATED, APPROVED, or COMPLETED orders). If that code is still there, GlobalExceptionHandler never sees a PayPal error, because the exception is swallowed before it can propagate. The new handler only helps once that fallback is removed. Run grep -n "SANDBOX-SIM\|400.00" backend/src/main/java -r. Any hit means the original bug is still live.

Things to verify in the new code

Status vocabulary. PayPal returns COMPLETED for a capture, while your frontend checks for CAPTURED. Confirm the controller returns your payment’s status, mapped from PayPal’s COMPLETED only after the amount and currency match the stored milestone amount. Otherwise real captures will show the red banner.
ProjectController.captureOrder. Make sure its try/catch that returned HTTP 200 with status: "ERROR" is removed, or the handler is bypassed there too.
Error body. Returning PayPal’s raw error body to the browser is fine in sandbox, but log the debug_id server-side and send a trimmed message. Raw provider responses can expose internal details.
Timeouts. A network timeout should map to an UNKNOWN state, not FAILED, because the capture may have succeeded. The spec in your brief says the same.
Missing handlers. Add a fallback for IllegalStateException (for example “not accepted” or “payment not captured”), which would otherwise return 500.

Tests to add (assert on status and on the stored payment row, not only the HTTP code)

Mock PayPal to return a CREATED order: the response must not be CAPTURED.
Mock a 422 INSTRUMENT_DECLINED: expect 422 and a payment of FAILED.
Mock a 5xx: expect 502 and no payment marked captured.
A successful capture whose amount differs from the milestone amount: expect no CAPTURED.