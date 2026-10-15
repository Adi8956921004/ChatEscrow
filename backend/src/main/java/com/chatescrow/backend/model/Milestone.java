package com.chatescrow.backend.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "milestones")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class Milestone {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    @Column(nullable = false)
    private String projectId;
    private String contractVersionId;
    @Column(nullable = false)
    private String title;
    private BigDecimal amount;
    @Builder.Default
    private String currency = "USD";
    private LocalDate dueDate;
    @Column(columnDefinition = "TEXT")
    private String deliverables;
    @Column(columnDefinition = "TEXT")
    private String acceptanceCriteria;
    private String description;
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private MilestoneStatus status = MilestoneStatus.NOT_STARTED;
    @Builder.Default
    private Instant createdAt = Instant.now();
    @Builder.Default
    private Instant updatedAt = Instant.now();

    public enum MilestoneStatus {
        NOT_STARTED, IN_PROGRESS, SUBMITTED, ACCEPTED,
        REVISION_REQUESTED, DISAGREEMENT_FLAGGED
    }
}
