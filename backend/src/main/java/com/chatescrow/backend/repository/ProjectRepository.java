package com.chatescrow.backend.repository;
import com.chatescrow.backend.model.Project;
import org.springframework.data.jpa.repository.JpaRepository;
public interface ProjectRepository extends JpaRepository<Project, String> {}
