package com.chatescrow.backend.service;

import com.chatescrow.backend.ai.AiService;
import com.chatescrow.backend.model.ContractVersion;
import com.chatescrow.backend.repository.ContractVersionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.List;

@Service
@Slf4j
@RequiredArgsConstructor
public class ContractService {

    private final ContractVersionRepository contractRepo;
    private final AiService aiService;
    private final ProjectService projectService;

    public List<ContractVersion> getContractVersions(String projectId) {
        String resolvedId = projectService.resolveProjectId(projectId);
        return contractRepo.findByProjectIdOrderByVersionNumberDesc(resolvedId);
    }

    public ContractVersion getLatestVersion(String projectId) {
        String resolvedId = projectService.resolveProjectId(projectId);
        return contractRepo.findTopByProjectIdOrderByVersionNumberDesc(resolvedId)
                .orElseThrow(() -> new RuntimeException("No contract versions found for project: " + projectId));
    }

    /**
     * Generates a new contract draft from pasted conversation text using AI extraction.
     * Any edits by the user invalidate approvals and create a new version.
     */
    @Transactional
    public ContractVersion generateDraftFromConversation(String projectId, String conversationText) {
        String resolvedId = projectService.resolveProjectId(projectId);
        projectService.getProject(resolvedId); // validate
        int nextVersion = contractRepo.findByProjectIdOrderByVersionNumberDesc(resolvedId).size() + 1;
        String termsJson = aiService.extractContract(conversationText);

        ContractVersion cv = ContractVersion.builder()
                .projectId(resolvedId)
                .versionNumber(nextVersion)
                .termsJson(termsJson)
                .generatedFromConversation(true)
                .clientApprovalStatus(ContractVersion.ApprovalStatus.PENDING)
                .freelancerApprovalStatus(ContractVersion.ApprovalStatus.PENDING)
                .createdAt(Instant.now())
                .build();
        cv = contractRepo.save(cv);

        projectService.audit(resolvedId, "system", "AI",
                "CONTRACT_DRAFT_GENERATED", "ContractVersion", cv.getId(),
                "{\"version\":" + nextVersion + ",\"aiGenerated\":true}");
        log.info("Generated contract draft v{} for project {}", nextVersion, resolvedId);
        return cv;
    }

    /**
     * Saves an edited contract draft. Any edit creates a new version and clears approvals.
     */
    @Transactional
    public ContractVersion saveDraft(String projectId, String termsJson) {
        String resolvedId = projectService.resolveProjectId(projectId);
        projectService.getProject(resolvedId);
        int nextVersion = contractRepo.findByProjectIdOrderByVersionNumberDesc(resolvedId).size() + 1;
        ContractVersion cv = ContractVersion.builder()
                .projectId(resolvedId)
                .versionNumber(nextVersion)
                .termsJson(termsJson)
                .generatedFromConversation(false)
                .clientApprovalStatus(ContractVersion.ApprovalStatus.PENDING)
                .freelancerApprovalStatus(ContractVersion.ApprovalStatus.PENDING)
                .createdAt(Instant.now())
                .build();
        cv = contractRepo.save(cv);
        projectService.audit(resolvedId, "user", "User",
                "CONTRACT_DRAFT_SAVED", "ContractVersion", cv.getId(),
                "{\"version\":" + nextVersion + "}");
        return cv;
    }

    /**
     * Records a party's approval of the current contract version.
     * Both parties must approve the SAME version before payment/work can proceed.
     */
    @Transactional
    public ContractVersion approveVersion(String versionId, String role) {
        ContractVersion cv = contractRepo.findById(versionId)
                .orElseThrow(() -> new RuntimeException("Contract version not found: " + versionId));

        if ("client".equalsIgnoreCase(role)) {
            cv.setClientApprovalStatus(ContractVersion.ApprovalStatus.APPROVED);
            cv.setClientApprovedAt(Instant.now());
        } else if ("freelancer".equalsIgnoreCase(role)) {
            cv.setFreelancerApprovalStatus(ContractVersion.ApprovalStatus.APPROVED);
            cv.setFreelancerApprovedAt(Instant.now());
        } else {
            throw new IllegalArgumentException("Role must be 'client' or 'freelancer'");
        }

        cv = contractRepo.save(cv);
        projectService.audit(cv.getProjectId(), role, role,
                "CONTRACT_APPROVED_BY_" + role.toUpperCase(), "ContractVersion", versionId,
                "{\"role\":\"" + role + "\",\"agreed\":" + cv.isAgreed() + "}");

        if (cv.isAgreed()) {
            projectService.audit(cv.getProjectId(), "system", "System",
                    "CONTRACT_AGREED", "ContractVersion", versionId, "{}");
        }
        return cv;
    }

    public ContractVersion getVersion(String versionId) {
        return contractRepo.findById(versionId)
                .orElseThrow(() -> new RuntimeException("Contract version not found: " + versionId));
    }
}
