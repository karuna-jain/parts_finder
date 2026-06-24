package com.hero.parts.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "part_relationships")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PartRelationship {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "kit_id", nullable = false)
    private Kit kit;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "parent_part_id", nullable = false)
    private Part parentPart;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "child_part_id", nullable = false)
    private Part childPart;

    @Column(nullable = false)
    private Integer quantity;
}
