package com.hero.parts.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "parts")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Part {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "part_number", nullable = false, unique = true)
    private String partNumber;

    @Column(nullable = false)
    private String name;

    @Column(name = "normalized_name", nullable = false)
    private String normalizedName;

    @Column(nullable = false)
    private String category;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "system_id")
    private PartSystem system;

    @Column(name = "sub_system")
    private String subSystem;

    private BigDecimal confidence;

    @Column(nullable = false)
    private BigDecimal mrp;

    @Column(nullable = false)
    private Integer quantity;

    @Column(name = "is_kit", nullable = false)
    private Boolean isKit = false;

    @Column(columnDefinition = "TEXT")
    private String description;

    // Diagram mapping
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "diagram_id")
    private ExplodedDiagram diagram;

    @Column(name = "hotspot_number")
    private Integer hotspotNumber;

    // Inventory & costings
    @Column(name = "oem_number")
    private String oemNumber;

    @Column(name = "rack_location")
    private String rackLocation;

    @Column(name = "reorder_level")
    private Integer reorderLevel;

    private String supplier;

    @Column(name = "last_purchase_date")
    private LocalDate lastPurchaseDate;

    @Column(name = "last_purchase_price")
    private BigDecimal lastPurchasePrice;

    @Column(name = "dealer_price")
    private BigDecimal dealerPrice;

    @Column(name = "sales_history")
    private String salesHistory;

    @Column(name = "superseded_by")
    private String supersededBy;

    private String alternatives;

    @OneToMany(mappedBy = "part", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @ToString.Exclude
    private List<PartImage> images = new ArrayList<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "compatibility",
        joinColumns = @JoinColumn(name = "part_id"),
        inverseJoinColumns = @JoinColumn(name = "model_id")
    )
    @ToString.Exclude
    private List<Model> compatibleModels = new ArrayList<>();
}
