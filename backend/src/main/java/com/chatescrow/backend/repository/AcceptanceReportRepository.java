package com.chatescrow.backend.repository;
import com.chatescrow.backend.model.AcceptanceReport;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface AcceptanceReportRepository extends JpaRepository<AcceptanceReport, String> {
    List<AcceptanceReport> findBySubmissionIdOrderByCreatedAtDesc(String submissionId);
}
