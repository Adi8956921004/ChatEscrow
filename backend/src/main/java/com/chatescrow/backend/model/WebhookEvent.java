package com.chatescrow.backend.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "webhook_events")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class WebhookEvent {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    @Column(unique = true)
    private String providerEventId;
    private String eventType;
    @Enumerated(EnumType.STRING)
    private VerificationStatus verificationStatus = VerificationStatus.PENDING;
    @Column(columnDefinition = "TEXT")
    private String rawPayload;
    private Instant processedAt;
    private String processingResult;
    private Instant createdAt = Instant.now();

    public enum VerificationStatus { PENDING, VERIFIED, FAILED, SKIPPED }
}
