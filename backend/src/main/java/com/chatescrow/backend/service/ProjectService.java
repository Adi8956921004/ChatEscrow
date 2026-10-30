package com.chatescrow.backend.service;

import com.chatescrow.backend.exception.ResourceNotFoundException;
import com.chatescrow.backend.model.*;
import com.chatescrow.backend.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Service
@Slf4j
@RequiredArgsConstructor
public class ProjectService {

    private final ProjectRepository projectRepo;
    private final MilestoneRepository milestoneRepo;
    private final SubmissionRepository submissionRepo;
    private final PaymentRepository paymentRepo;
    private final AuditEventRepository auditRepo;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public record MilestoneSyncDto(
            String title,
            BigDecimal amount,
            String dueDate,
            String deliverables,
            String acceptanceCriteria,
            String description,
            String status
    ) {}

    public String resolveProjectId(String id) {
        if (id == null || id.isBlank()) {
            throw new IllegalArgumentException("Project ID is required");
        }
        return id;
    }

    public List<Project> getAllProjects() {
        return projectRepo.findAll();
    }

    public Project getProject(String id) {
        if (id == null || id.isBlank()) {
            throw new ResourceNotFoundException("Project ID is required");
        }
        return projectRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found: " + id));
    }

    @Transactional
    public Project createProject(String title, String description, String clientName,
                                  String clientEmail, String freelancerName, String freelancerEmail,
                                  BigDecimal budget, String currency) {
        Project p = Project.builder()
                .title(title)
                .description(description)
                .clientName(clientName)
                .clientEmail(clientEmail)
                .freelancerName(freelancerName)
                .freelancerEmail(freelancerEmail)
                .totalBudget(budget)
                .currency(currency != null ? currency : "USD")
                .status(Project.ProjectStatus.ACTIVE)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        p = projectRepo.save(p);

        ObjectNode meta = objectMapper.createObjectNode();
        meta.put("title", title);
        audit(p.getId(), "system", "System", "PROJECT_CREATED", "Project", p.getId(), meta.toString());
        return p;
    }

    @Transactional
    public Project syncProjectAndMilestones(String projectId, String title, String description,
                                            BigDecimal budget, String clientName, String freelancerName,
                                            List<MilestoneSyncDto> newMilestones) {
        String resolvedId = resolveProjectId(projectId);
        Project project = getProject(resolvedId);

        if (title != null && !title.isBlank()) {
            project.setTitle(title.trim());
        }
        if (description != null && !description.isBlank()) {
            project.setDescription(description.trim());
        }
        if (budget != null && budget.compareTo(BigDecimal.ZERO) > 0) {
            project.setTotalBudget(budget);
        }
        if (clientName != null && !clientName.isBlank() && !clientName.equalsIgnoreCase("Needs confirmation")) {
            project.setClientName(clientName.trim());
        }
        if (freelancerName != null && !freelancerName.isBlank() && !freelancerName.equalsIgnoreCase("Needs confirmation")) {
            project.setFreelancerName(freelancerName.trim());
            if (project.getFreelancerEmail() == null || project.getFreelancerEmail().isBlank()) {
                project.setFreelancerEmail(freelancerName.toLowerCase().replaceAll("\\s+", ".") + "@example.com");
            }
        }
        project.setUpdatedAt(Instant.now());
        project = projectRepo.save(project);

        if (newMilestones != null && !newMilestones.isEmpty()) {
            // Find existing milestones
            List<Milestone> existing = milestoneRepo.findByProjectIdOrderByCreatedAt(resolvedId);

            // Remove uncaptured/unpaid old milestones
            for (Milestone m : existing) {
                boolean hasPayment = paymentRepo.findByMilestoneId(m.getId()).stream()
                        .anyMatch(p -> p.getStatus() == Payment.PaymentStatus.CAPTURED);
                if (!hasPayment) {
                    submissionRepo.deleteByMilestoneId(m.getId());
                    milestoneRepo.delete(m);
                }
            }

            // Create the new milestones
            boolean isFirst = true;
            for (MilestoneSyncDto dto : newMilestones) {
                if (dto.title() == null || dto.title().isBlank()) continue;
                BigDecimal amt = dto.amount() != null && dto.amount().compareTo(BigDecimal.ZERO) > 0
                        ? dto.amount() : BigDecimal.valueOf(100);

                java.time.LocalDate parsedDueDate = null;
                if (dto.dueDate() != null && !dto.dueDate().isBlank()) {
                    try {
                        parsedDueDate = java.time.LocalDate.parse(dto.dueDate().trim());
                    } catch (Exception ignored) {}
                }

                Milestone.MilestoneStatus initialStatus = Milestone.MilestoneStatus.NOT_STARTED;
                if (dto.status() != null && !dto.status().isBlank()) {
                    try {
                        initialStatus = Milestone.MilestoneStatus.valueOf(dto.status().trim().toUpperCase());
                    } catch (Exception ignored) {}
                } else if (isFirst) {
                    // Start first milestone in SUBMITTED so user can immediately test review and evaluation workflow!
                    initialStatus = Milestone.MilestoneStatus.SUBMITTED;
                }

                Milestone m = Milestone.builder()
                        .projectId(resolvedId)
                        .title(dto.title().trim())
                        .amount(amt)
                        .currency("USD")
                        .dueDate(parsedDueDate)
                        .deliverables(dto.deliverables() != null ? dto.deliverables() : dto.title() + " completion package")
                        .acceptanceCriteria(dto.acceptanceCriteria() != null ? dto.acceptanceCriteria() : "Approved by client upon review")
                        .description(dto.description() != null ? dto.description() : "Agreed milestone: " + dto.title())
                        .status(initialStatus)
                        .createdAt(Instant.now())
                        .updatedAt(Instant.now())
                        .build();
                m = milestoneRepo.save(m);

                // If marked SUBMITTED, create an initial submission so Review screen has real evidence to evaluate
                if (initialStatus == Milestone.MilestoneStatus.SUBMITTED) {
                    submissionRepo.save(Submission.builder()
                            .milestoneId(m.getId())
                            .submittedBy(project.getFreelancerName())
                            .description("Completed deliverable package for " + m.getTitle() + " adhering to all agreed specifications.")
                            .evidenceLinks("https://github.com/example/" + resolvedId.substring(0, 8) + "/" + m.getTitle().toLowerCase().replaceAll("\\s+", "-"))
                            .fileReferences("deliverable_v1_final.zip")
                            .createdAt(Instant.now())
                            .build());
                }

                isFirst = false;
            }
        }

        ObjectNode meta = objectMapper.createObjectNode();
        meta.put("title", project.getTitle());
        meta.put("totalBudget", project.getTotalBudget());
        meta.put("milestoneCount", newMilestones != null ? newMilestones.size() : 0);
        audit(resolvedId, "system", "System", "PROJECT_SYNCED", "Project", resolvedId, meta.toString());
        log.info("Synced project and milestones for {}: title='{}', budget={}", resolvedId, project.getTitle(), project.getTotalBudget());

        return project;
    }

    public List<Milestone> getMilestones(String projectId) {
        getProject(projectId); // validate exists
        return milestoneRepo.findByProjectIdOrderByCreatedAt(projectId);
    }

    @Transactional
    public Milestone createMilestone(String projectId, String title, BigDecimal amount,
                                      String dueDate, String deliverables, String criteria,
                                      String description, String contractVersionId) {
        getProject(projectId); // validate exists
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Milestone amount must be positive");
        }
        java.time.LocalDate parsedDueDate = null;
        if (dueDate != null && !dueDate.isBlank()) {
            try {
                parsedDueDate = java.time.LocalDate.parse(dueDate.trim());
            } catch (Exception ignored) {}
        }
        Milestone m = Milestone.builder()
                .projectId(projectId)
                .contractVersionId(contractVersionId)
                .title(title)
                .amount(amount)
                .dueDate(parsedDueDate)
                .deliverables(deliverables)
                .acceptanceCriteria(criteria)
                .description(description)
                .status(Milestone.MilestoneStatus.NOT_STARTED)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        m = milestoneRepo.save(m);

        ObjectNode meta = objectMapper.createObjectNode();
        meta.put("title", title);
        audit(projectId, "system", "System", "MILESTONE_CREATED", "Milestone", m.getId(), meta.toString());
        return m;
    }

    public List<AuditEvent> getTimeline(String projectId) {
        getProject(projectId);
        return auditRepo.findByProjectIdOrderByCreatedAtDesc(projectId);
    }

    public void audit(String projectId, String actorId, String actorName,
                      String eventType, String entityType, String entityId, String meta) {
        auditRepo.save(AuditEvent.builder()
                .projectId(projectId)
                .actorId(actorId)
                .actorName(actorName)
                .eventType(eventType)
                .entityType(entityId != null ? entityType : "General")
                .entityId(entityId)
                .safeMetadata(meta)
                .createdAt(Instant.now())
                .build());
    }
}
