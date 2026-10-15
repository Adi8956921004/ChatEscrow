package com.chatescrow.backend.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "projects")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class Project {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    @Column(nullable = false)
    private String title;
    private String description;
    private String clientId;
    private String clientName;
    private String freelancerId;
    private String freelancerName;
    @Builder.Default
    private String currency = "USD";
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private ProjectStatus status = ProjectStatus.ACTIVE;
    private BigDecimal totalBudget;
    @Builder.Default
    private Instant createdAt = Instant.now();
    @Builder.Default
    private Instant updatedAt = Instant.now();

    public enum ProjectStatus { ACTIVE, COMPLETED, CANCELLED }
}
