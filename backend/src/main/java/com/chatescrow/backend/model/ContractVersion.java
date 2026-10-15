package com.chatescrow.backend.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "contract_versions")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class ContractVersion {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    @Column(nullable = false)
    private String projectId;
    private int versionNumber;
    @Column(columnDefinition = "TEXT")
    private String termsJson;
    private boolean generatedFromConversation;
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private ApprovalStatus clientApprovalStatus = ApprovalStatus.PENDING;
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private ApprovalStatus freelancerApprovalStatus = ApprovalStatus.PENDING;
    private Instant clientApprovedAt;
    private Instant freelancerApprovedAt;
    @Builder.Default
    private Instant createdAt = Instant.now();

    public enum ApprovalStatus { PENDING, APPROVED, REJECTED }

    public boolean isAgreed() {
        return clientApprovalStatus == ApprovalStatus.APPROVED
                && freelancerApprovalStatus == ApprovalStatus.APPROVED;
    }
}
