package com.chatescrow.backend.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "submissions")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class Submission {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    @Column(nullable = false)
    private String milestoneId;
    private String submittedBy;
    @Column(columnDefinition = "TEXT")
    private String description;
    @Column(columnDefinition = "TEXT")
    private String evidenceLinks;
    @Column(columnDefinition = "TEXT")
    private String fileReferences;
    private Instant createdAt = Instant.now();
}
