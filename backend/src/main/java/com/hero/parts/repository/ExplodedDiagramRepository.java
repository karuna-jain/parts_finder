package com.hero.parts.repository;

import com.hero.parts.model.ExplodedDiagram;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ExplodedDiagramRepository extends JpaRepository<ExplodedDiagram, Long> {
    List<ExplodedDiagram> findBySystemId(Long systemId);
    List<ExplodedDiagram> findByModelId(Long modelId);
}
