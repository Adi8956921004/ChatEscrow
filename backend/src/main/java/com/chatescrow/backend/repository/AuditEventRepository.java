package com.chatescrow.backend.repository;
import com.chatescrow.backend.model.AuditEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface AuditEventRepository extends JpaRepository<AuditEvent, String> {
    List<AuditEvent> findByProjectIdOrderByCreatedAtDesc(String projectId);
}
