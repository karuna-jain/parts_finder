package com.hero.parts.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "exploded_diagrams")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ExplodedDiagram {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String svgData;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "system_id")
    private PartSystem system;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "model_id")
    private Model model;
}
