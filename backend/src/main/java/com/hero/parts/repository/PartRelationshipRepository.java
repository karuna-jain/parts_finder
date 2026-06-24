package com.hero.parts.repository;

import com.hero.parts.model.PartRelationship;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface PartRelationshipRepository extends JpaRepository<PartRelationship, Long> {
    
    List<PartRelationship> findByKitId(Long kitId);
    
    List<PartRelationship> findByParentPartId(Long parentPartId);
    
    List<PartRelationship> findByChildPartId(Long childPartId);
}
