package com.chatescrow.backend.repository;
import com.chatescrow.backend.model.Milestone;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface MilestoneRepository extends JpaRepository<Milestone, String> {
    List<Milestone> findByProjectIdOrderByCreatedAt(String projectId);
}
