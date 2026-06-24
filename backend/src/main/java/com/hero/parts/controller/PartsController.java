package com.hero.parts.controller;

import com.hero.parts.model.*;
import com.hero.parts.service.PartsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*") // Allow frontend access
public class PartsController {

    @Autowired
    private PartsService partsService;

    // --- PARTS ENDPOINTS ---

    @GetMapping("/parts")
    public ResponseEntity<List<Part>> getAllParts(@RequestParam(required = false) String search) {
        if (search != null && !search.trim().isEmpty()) {
            return ResponseEntity.ok(partsService.searchParts(search));
        }
        return ResponseEntity.ok(partsService.getAllParts());
    }

    @GetMapping("/parts/search")
    public ResponseEntity<List<Part>> searchParts(@RequestParam String query) {
        return ResponseEntity.ok(partsService.searchParts(query));
    }

    @GetMapping("/parts/{id}")
    public ResponseEntity<Part> getPartById(@PathVariable Long id) {
        return partsService.getPartById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/parts/number/{partNumber}")
    public ResponseEntity<Part> getPartByNumber(@PathVariable String partNumber) {
        return partsService.getPartByNumber(partNumber)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/parts/{id}/related")
    public ResponseEntity<List<Part>> getRelatedParts(@PathVariable Long id) {
        return ResponseEntity.ok(partsService.getRelatedParts(id));
    }

    @PostMapping("/parts")
    public ResponseEntity<Part> createOrUpdatePart(@RequestBody Part part) {
        return ResponseEntity.ok(partsService.savePart(part));
    }

    @DeleteMapping("/parts/{id}")
    public ResponseEntity<Void> deletePart(@PathVariable Long id) {
        partsService.deletePart(id);
        return ResponseEntity.ok().build();
    }

    // --- KITS ENDPOINTS ---

    @GetMapping("/kits")
    public ResponseEntity<List<Kit>> getAllKits(@RequestParam(required = false) String search) {
        if (search != null && !search.trim().isEmpty()) {
            return ResponseEntity.ok(partsService.searchKits(search));
        }
        return ResponseEntity.ok(partsService.getAllKits());
    }

    @GetMapping("/kits/{id}")
    public ResponseEntity<Map<String, Object>> getKitById(@PathVariable Long id) {
        Optional<Kit> kitOpt = partsService.getKitById(id);
        if (kitOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Kit kit = kitOpt.get();
        List<PartRelationship> relationships = partsService.getKitRelationships(id);

        Map<String, Object> response = new HashMap<>();
        response.put("id", kit.getId());
        response.put("kitNumber", kit.getKitNumber());
        response.put("name", kit.getName());
        response.put("parentPart", kit.getPart());
        
        List<Map<String, Object>> childParts = new ArrayList<>();
        for (PartRelationship rel : relationships) {
            Map<String, Object> childInfo = new HashMap<>();
            childInfo.put("relationshipId", rel.getId());
            childInfo.put("part", rel.getChildPart());
            childInfo.put("quantity", rel.getQuantity());
            childParts.add(childInfo);
        }
        response.put("childParts", childParts);

        return ResponseEntity.ok(response);
    }

    // --- SYSTEMS ENDPOINTS ---

    @GetMapping("/systems")
    public ResponseEntity<List<PartSystem>> getAllSystems() {
        return ResponseEntity.ok(partsService.getAllSystems());
    }

    @GetMapping("/systems/{id}")
    public ResponseEntity<Map<String, Object>> getSystemById(@PathVariable Long id) {
        Optional<PartSystem> systemOpt = partsService.getSystemById(id);
        if (systemOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        PartSystem system = systemOpt.get();
        List<Part> parts = partsService.getPartsBySystem(id);

        Map<String, Object> response = new HashMap<>();
        response.put("id", system.getId());
        response.put("name", system.getName());
        response.put("description", system.getDescription());
        response.put("parts", parts);

        return ResponseEntity.ok(response);
    }

    // --- BRANDS ENDPOINTS ---

    @GetMapping("/brands")
    public ResponseEntity<List<Brand>> getAllBrands() {
        return ResponseEntity.ok(partsService.getAllBrands());
    }

    @PostMapping("/brands")
    public ResponseEntity<Brand> createBrand(@RequestBody Brand brand) {
        return ResponseEntity.ok(partsService.saveBrand(brand));
    }

    // --- MODELS ENDPOINTS ---

    @GetMapping("/models")
    public ResponseEntity<List<Model>> getAllModels() {
        return ResponseEntity.ok(partsService.getAllModels());
    }

    @PostMapping("/models")
    public ResponseEntity<Model> createModel(@RequestBody Model model) {
        return ResponseEntity.ok(partsService.saveModel(model));
    }

    // --- DIAGRAMS ENDPOINTS ---

    @GetMapping("/diagrams")
    public ResponseEntity<List<ExplodedDiagram>> getAllDiagrams() {
        return ResponseEntity.ok(partsService.getAllDiagrams());
    }

    @GetMapping("/diagrams/{id}")
    public ResponseEntity<ExplodedDiagram> getDiagramById(@PathVariable Long id) {
        return partsService.getDiagramById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
