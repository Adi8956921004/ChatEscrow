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
    private final AuditEventRepository auditRepo;
    private final ObjectMapper objectMapper = new ObjectMapper();

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

        ObjectNode meta = objectMapper.createObjectNode();
        meta.put("title", title);
        audit(p.getId(), "system", "System", "PROJECT_CREATED", "Project", p.getId(), meta.toString());
        return p;
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
                .entityType(entityType)
                .entityId(entityId)
                .safeMetadata(meta)
                .createdAt(Instant.now())
                .build());
    }
}
