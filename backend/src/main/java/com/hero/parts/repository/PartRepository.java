package com.hero.parts.repository;

import com.hero.parts.model.Part;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface PartRepository extends JpaRepository<Part, Long> {
    
    Optional<Part> findByPartNumber(String partNumber);
    
    @Query("SELECT p FROM Part p WHERE " +
           "LOWER(p.partNumber) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(p.name) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(p.normalizedName) LIKE LOWER(CONCAT('%', :query, '%'))")
    List<Part> searchParts(@Param("query") String query);
    
    List<Part> findBySystemId(Long systemId);
    
    List<Part> findByCategoryIgnoreCase(String category);
}
