package com.chatescrow.backend.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "acceptance_reports")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class AcceptanceReport {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    @Column(nullable = false)
    private String submissionId;
    @Column(columnDefinition = "TEXT")
    private String criterionResultsJson;
    @Column(columnDefinition = "TEXT")
    private String evidenceSummary;
    @Column(columnDefinition = "TEXT")
    private String missingItemsJson;
    private String uncertainty;
    private String recommendation;
    private String overallSummary;
    private String modelName;
    private boolean aiGenerated = true;
    private Instant createdAt = Instant.now();
}
