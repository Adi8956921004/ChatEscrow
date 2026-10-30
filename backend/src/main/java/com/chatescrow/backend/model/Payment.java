package com.chatescrow.backend.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "payments")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class Payment {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    private String projectId;
    private String milestoneId;
    @Builder.Default
    private String provider = "PAYPAL";
    private String providerOrderId;
    private String providerCaptureId;
    private BigDecimal amount;            // expected / order amount
    private BigDecimal capturedAmount;    // what PayPal actually charged (may differ on mismatch)
    @Builder.Default
    private String currency = "USD";
    private String capturedCurrency;      // currency PayPal actually used (may differ on mismatch)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private PaymentStatus status = PaymentStatus.NOT_CREATED;
    private Instant verifiedAt;
    @Builder.Default
    private Instant createdAt = Instant.now();
    @Builder.Default
    private Instant updatedAt = Instant.now();

    public enum PaymentStatus {
        NOT_CREATED, ORDER_CREATED, APPROVAL_PENDING, CAPTURE_PENDING,
        CAPTURED, FAILED, CANCELLED, REFUNDED, UNKNOWN
    }
}
