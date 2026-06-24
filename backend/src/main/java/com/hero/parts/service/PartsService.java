package com.hero.parts.service;

import com.hero.parts.model.*;
import com.hero.parts.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.*;

@Service
public class PartsService {

    @Autowired
    private PartRepository partRepository;

    @Autowired
    private KitRepository kitRepository;

    @Autowired
    private PartSystemRepository systemRepository;

    @Autowired
    private PartRelationshipRepository relationshipRepository;

    @Autowired
    private ExplodedDiagramRepository diagramRepository;

    @Autowired
    private BrandRepository brandRepository;

    @Autowired
    private ModelRepository modelRepository;

    // --- PARTS METHODS ---

    public List<Part> getAllParts() {
        return partRepository.findAll();
    }

    public Optional<Part> getPartById(Long id) {
        return partRepository.findById(id);
    }

    public Optional<Part> getPartByNumber(String partNumber) {
        return partRepository.findByPartNumber(partNumber);
    }

    public List<Part> searchParts(String query) {
        if (query == null || query.trim().isEmpty()) {
            return partRepository.findAll();
        }
        return partRepository.searchParts(query.trim());
    }

    public Part savePart(Part part) {
        if (part.getNormalizedName() == null || part.getNormalizedName().isEmpty()) {
            part.setNormalizedName(part.getName());
        }
        return partRepository.save(part);
    }

    public void deletePart(Long id) {
        partRepository.deleteById(id);
    }

    public List<Part> getRelatedParts(Long partId) {
        Optional<Part> partOpt = partRepository.findById(partId);
        if (partOpt.isEmpty()) {
            return Collections.emptyList();
        }
        
        Part part = partOpt.get();
        Set<Part> related = new LinkedHashSet<>();

        // 1. Get parts from the same kit(s) (sibling parts)
        List<PartRelationship> childRelations = relationshipRepository.findByChildPartId(partId);
        for (PartRelationship cr : childRelations) {
            Kit parentKit = cr.getKit();
            List<PartRelationship> siblingRelations = relationshipRepository.findByKitId(parentKit.getId());
            for (PartRelationship sr : siblingRelations) {
                if (!sr.getChildPart().getId().equals(partId)) {
                    related.add(sr.getChildPart());
                }
            }
            related.add(cr.getParentPart());
        }

        // If this part is itself a kit (parent), add its children
        List<PartRelationship> parentRelations = relationshipRepository.findByParentPartId(partId);
        for (PartRelationship pr : parentRelations) {
            related.add(pr.getChildPart());
        }

        // 2. Fallback: If still few related parts, add parts from the same system/category
        if (related.size() < 4 && part.getSystem() != null) {
            List<Part> systemParts = partRepository.findBySystemId(part.getSystem().getId());
            for (Part sp : systemParts) {
                if (!sp.getId().equals(partId)) {
                    related.add(sp);
                }
                if (related.size() >= 8) break;
            }
        }

        return new ArrayList<>(related);
    }

    // --- KITS METHODS ---

    public List<Kit> getAllKits() {
        return kitRepository.findAll();
    }

    public Optional<Kit> getKitById(Long id) {
        return kitRepository.findById(id);
    }

    public List<Kit> searchKits(String query) {
        if (query == null || query.trim().isEmpty()) {
            return kitRepository.findAll();
        }
        return kitRepository.searchKits(query.trim());
    }

    public List<PartRelationship> getKitRelationships(Long kitId) {
        return relationshipRepository.findByKitId(kitId);
    }

    // --- SYSTEM/CATEGORY METHODS ---

    public List<PartSystem> getAllSystems() {
        return systemRepository.findAll();
    }

    public Optional<PartSystem> getSystemById(Long id) {
        return systemRepository.findById(id);
    }

    public List<Part> getPartsBySystem(Long systemId) {
        return partRepository.findBySystemId(systemId);
    }

    // --- DIAGRAM METHODS ---

    public List<ExplodedDiagram> getAllDiagrams() {
        return diagramRepository.findAll();
    }

    public Optional<ExplodedDiagram> getDiagramById(Long id) {
        return diagramRepository.findById(id);
    }

    public List<ExplodedDiagram> getDiagramsByModel(Long modelId) {
        return diagramRepository.findByModelId(modelId);
    }

    public List<ExplodedDiagram> getDiagramsBySystem(Long systemId) {
        return diagramRepository.findBySystemId(systemId);
    }

    // --- BRANDS & MODELS ---

    public List<Brand> getAllBrands() {
        return brandRepository.findAll();
    }

    public Brand saveBrand(Brand brand) {
        return brandRepository.save(brand);
    }

    public List<Model> getAllModels() {
        return modelRepository.findAll();
    }

    public Model saveModel(Model model) {
        return modelRepository.save(model);
    }
}
