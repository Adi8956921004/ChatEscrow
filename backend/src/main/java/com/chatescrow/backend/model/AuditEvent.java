package com.chatescrow.backend.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "audit_events")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class AuditEvent {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    private String projectId;
    private String actorId;
    private String actorName;
    private String eventType;
    private String entityType;
    private String entityId;
    @Column(columnDefinition = "TEXT")
    private String safeMetadata;
    private Instant createdAt = Instant.now();
}
