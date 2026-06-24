package com.hero.parts.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "part_images")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PartImage {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "part_id", nullable = false)
    @JsonIgnore
    private Part part;

    @Column(name = "image_url", nullable = false)
    private String imageUrl;
}
