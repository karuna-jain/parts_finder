package com.hero.parts.repository;

import com.hero.parts.model.PartSystem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PartSystemRepository extends JpaRepository<PartSystem, Long> {
}
