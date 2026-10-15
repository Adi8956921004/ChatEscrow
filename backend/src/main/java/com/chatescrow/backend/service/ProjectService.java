package com.chatescrow.backend.service;

import com.chatescrow.backend.model.*;
import com.chatescrow.backend.repository.*;
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
    private final AuditEventRepository auditRepo;

    public String resolveProjectId(String id) {
        if (id == null || id.isBlank() || "demo-project-001".equals(id)) {
            return projectRepo.findAll().stream()
                    .map(Project::getId)
                    .findFirst()
                    .orElse(id);
        }
        return id;
    }

    public List<Project> getAllProjects() {
        return projectRepo.findAll();
    }

    public Project getProject(String id) {
        String resolved = resolveProjectId(id);
        return projectRepo.findById(resolved)
                .or(() -> projectRepo.findAll().stream().findFirst())
                .orElseThrow(() -> new RuntimeException("Project not found: " + id));
    }

    @Transactional
    public Project createProject(String title, String description, String clientName,
                                  String freelancerName, BigDecimal budget, String currency) {
        Project p = Project.builder()
                .title(title)
                .description(description)
                .clientName(clientName)
                .freelancerName(freelancerName)
                .totalBudget(budget)
                .currency(currency != null ? currency : "USD")
                .status(Project.ProjectStatus.ACTIVE)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        p = projectRepo.save(p);
        audit(p.getId(), "system", "System", "PROJECT_CREATED", "Project", p.getId(),
                "{\"title\":\"" + title + "\"}");
        return p;
    }

    public List<Milestone> getMilestones(String projectId) {
        String resolved = resolveProjectId(projectId);
        return milestoneRepo.findByProjectIdOrderByCreatedAt(resolved);
    }

    @Transactional
    public Milestone createMilestone(String projectId, String title, BigDecimal amount,
                                      String dueDate, String deliverables, String criteria,
                                      String description, String contractVersionId) {
        String resolved = resolveProjectId(projectId);
        getProject(resolved); // validate exists
        Milestone m = Milestone.builder()
                .projectId(resolved)
                .contractVersionId(contractVersionId)
                .title(title)
                .amount(amount)
                .dueDate(dueDate != null ? java.time.LocalDate.parse(dueDate) : null)
                .deliverables(deliverables)
                .acceptanceCriteria(criteria)
                .description(description)
                .status(Milestone.MilestoneStatus.NOT_STARTED)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        m = milestoneRepo.save(m);
        audit(resolved, "system", "System", "MILESTONE_CREATED", "Milestone", m.getId(),
                "{\"title\":\"" + title + "\"}");
        return m;
    }

    public List<AuditEvent> getTimeline(String projectId) {
        String resolved = resolveProjectId(projectId);
        return auditRepo.findByProjectIdOrderByCreatedAtDesc(resolved);
    }

    public void audit(String projectId, String actorId, String actorName,
                      String eventType, String entityType, String entityId, String meta) {
        String resolved = resolveProjectId(projectId);
        auditRepo.save(AuditEvent.builder()
                .projectId(resolved)
                .actorId(actorId)
                .actorName(actorName)
                .eventType(eventType)
                .entityType(entityType)
                .entityId(entityId)
                .safeMetadata(meta)
                .createdAt(Instant.now())
                .build());
    }
}
