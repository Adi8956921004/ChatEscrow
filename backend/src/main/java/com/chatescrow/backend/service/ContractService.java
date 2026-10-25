package com.chatescrow.backend.service;

import com.chatescrow.backend.ai.AiService;
import com.chatescrow.backend.exception.ResourceNotFoundException;
import com.chatescrow.backend.model.ContractVersion;
import com.chatescrow.backend.repository.ContractVersionRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
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
    private final ObjectMapper objectMapper = new ObjectMapper();

    public List<ContractVersion> getContractVersions(String projectId) {
        String resolvedId = projectService.resolveProjectId(projectId);
        projectService.getProject(resolvedId);
        return contractRepo.findByProjectIdOrderByVersionNumberDesc(resolvedId);
    }

    public ContractVersion getLatestVersion(String projectId) {
        String resolvedId = projectService.resolveProjectId(projectId);
        projectService.getProject(resolvedId);
        return contractRepo.findTopByProjectIdOrderByVersionNumberDesc(resolvedId)
                .orElseThrow(() -> new ResourceNotFoundException("No contract versions found for project: " + projectId));
    }

    /**
     * Generates a new contract draft from pasted conversation text using AI extraction.
     * Any edits by the user invalidate approvals and create a new version.
     */
    @Transactional
    public ContractVersion generateDraftFromConversation(String projectId, String conversationText) {
        String resolvedId = projectService.resolveProjectId(projectId);
        projectService.getProject(resolvedId);
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

        ObjectNode meta = objectMapper.createObjectNode();
        meta.put("version", nextVersion);
        meta.put("aiGenerated", aiService.isLastCallLive());
        projectService.audit(resolvedId, "system", "AI",
                "CONTRACT_DRAFT_GENERATED", "ContractVersion", cv.getId(),
                meta.toString());
        log.info("Generated contract draft v{} for project {}", nextVersion, resolvedId);
        return cv;
    }

    /**
     * Saves an edited contract draft. Any edit creates a new version and clears approvals.
     */
    @Transactional
    public ContractVersion saveDraft(String projectId, String termsJson) {
        return saveDraft(projectId, null, termsJson);
    }

    /**
     * Saves an edited contract draft. If draftId is provided and exists for this project, updates it.
     */
    @Transactional
    public ContractVersion saveDraft(String projectId, String draftId, String termsJson) {
        String resolvedId = projectService.resolveProjectId(projectId);
        projectService.getProject(resolvedId);

        if (draftId != null && !draftId.isBlank()) {
            java.util.Optional<ContractVersion> existingOpt = contractRepo.findById(draftId);
            if (existingOpt.isPresent()) {
                ContractVersion existing = existingOpt.get();
                if (existing.getProjectId().equals(resolvedId)) {
                    existing.setTermsJson(termsJson);
                    existing.setClientApprovalStatus(ContractVersion.ApprovalStatus.PENDING);
                    existing.setFreelancerApprovalStatus(ContractVersion.ApprovalStatus.PENDING);
                    existing.setClientApprovedAt(null);
                    existing.setFreelancerApprovedAt(null);
                    existing = contractRepo.save(existing);

                    ObjectNode meta = objectMapper.createObjectNode();
                    meta.put("version", existing.getVersionNumber());
                    meta.put("draftId", existing.getId());
                    projectService.audit(resolvedId, "user", "User",
                            "CONTRACT_DRAFT_SAVED", "ContractVersion", existing.getId(),
                            meta.toString());
                    return existing;
                }
            }
        }

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

        ObjectNode meta = objectMapper.createObjectNode();
        meta.put("version", nextVersion);
        projectService.audit(resolvedId, "user", "User",
                "CONTRACT_DRAFT_SAVED", "ContractVersion", cv.getId(),
                meta.toString());
        return cv;
    }

    /**
     * Records a party's approval of the current contract version.
     * Both parties must approve the SAME version before payment/work can proceed.
     */
    @Transactional
    public ContractVersion approveVersion(String versionId, String role) {
        ContractVersion cv = contractRepo.findById(versionId)
                .orElseThrow(() -> new ResourceNotFoundException("Contract version not found: " + versionId));

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

        ObjectNode meta = objectMapper.createObjectNode();
        meta.put("role", role);
        meta.put("agreed", cv.isAgreed());

        projectService.audit(cv.getProjectId(), role, role,
                "CONTRACT_APPROVED_BY_" + role.toUpperCase(), "ContractVersion", versionId,
                meta.toString());

        if (cv.isAgreed()) {
            projectService.audit(cv.getProjectId(), "system", "System",
                    "CONTRACT_AGREED", "ContractVersion", versionId, "{}");
        }
        return cv;
    }

    public ContractVersion getVersion(String versionId) {
        return contractRepo.findById(versionId)
                .orElseThrow(() -> new ResourceNotFoundException("Contract version not found: " + versionId));
    }
}
