package com.chatescrow.backend.repository;
import com.chatescrow.backend.model.ContractVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface ContractVersionRepository extends JpaRepository<ContractVersion, String> {
    List<ContractVersion> findByProjectIdOrderByVersionNumberDesc(String projectId);
    java.util.Optional<ContractVersion> findTopByProjectIdOrderByVersionNumberDesc(String projectId);
}
