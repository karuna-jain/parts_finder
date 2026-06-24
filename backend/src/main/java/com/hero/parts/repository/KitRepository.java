package com.hero.parts.repository;

import com.hero.parts.model.Kit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface KitRepository extends JpaRepository<Kit, Long> {
    
    Optional<Kit> findByKitNumber(String kitNumber);
    
    @Query("SELECT k FROM Kit k WHERE " +
           "LOWER(k.kitNumber) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(k.name) LIKE LOWER(CONCAT('%', :query, '%'))")
    List<Kit> searchKits(@Param("query") String query);
}
