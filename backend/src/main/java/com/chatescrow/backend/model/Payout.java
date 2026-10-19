package com.chatescrow.backend.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "payouts")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class Payout {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(unique = true, nullable = false)
    private String milestoneId;

    private String projectId;
    private String recipientEmail;
    private BigDecimal amount;
    private String currency;
    private String payoutBatchId;
    private String idempotencyKey;
    private String status;
    private boolean simulated;
    private String provider;

    @Builder.Default
    private Instant releasedAt = Instant.now();
}
