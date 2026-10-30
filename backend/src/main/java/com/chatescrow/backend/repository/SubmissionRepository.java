package com.chatescrow.backend.repository;

import com.chatescrow.backend.model.Submission;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SubmissionRepository extends JpaRepository<Submission, String> {
    List<Submission> findByMilestoneIdOrderByCreatedAtDesc(String milestoneId);
    void deleteByMilestoneId(String milestoneId);
}
