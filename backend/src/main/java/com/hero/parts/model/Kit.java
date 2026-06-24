package com.hero.parts.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "kits")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Kit {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "part_id", nullable = false)
    private Part part;

    @Column(name = "kit_number", nullable = false, unique = true)
    private String kitNumber;

    @Column(nullable = false)
    private String name;
}
