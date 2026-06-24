import os
import decimal
import json
from datetime import date
from fastapi import FastAPI, Depends, HTTPException, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import or_
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional

from .database import get_db, engine, Base, db_available
from . import models
from .rag_engine import rag_engine

# Initialize FastAPI App
app = FastAPI(
    title="Motorcycle Parts Platform API",
    description="Python FastAPI backend providing parts inventory database APIs and RAG AI Chat.",
    version="1.0.0"
)

# Configure CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global in-memory dataset index for database-less fallback mode
IN_MEMORY_DATA = {
    "brands": [],
    "models": [],
    "systems": [],
    "parts": [],
    "kits": [],
    "part_relationships": [],
    "exploded_diagrams": [],
    "part_images": [],
    "compatibility": []
}

# Ensure RAG and In-Memory catalog are initialized on startup
@app.on_event("startup")
def startup_event():
    # Load RAG cache or parse PDF
    rag_engine.load_or_build_index()
    
    # Load in-memory fallback JSON data
    # 1. Look for full catalog data in root data directory
    root_dir = os.path.dirname(os.path.dirname(__file__))
    catalog_path = os.path.join(root_dir, "data", "catalog.json")
    if os.path.exists(catalog_path):
        try:
            with open(catalog_path, "r", encoding="utf-8") as f:
                raw_data = json.load(f)
                for key in IN_MEMORY_DATA.keys():
                    if key in raw_data:
                        IN_MEMORY_DATA[key] = raw_data[key]
            print(f"Loaded {len(IN_MEMORY_DATA['parts'])} parts from data/catalog.json in memory.")
        except Exception as e:
            print(f"Error loading data/catalog.json: {e}")
            
    # 2. Look for fallback items in frontend/src/catalog.json if empty
    frontend_catalog = os.path.join(root_dir, "frontend", "src", "catalog.json")
    if not IN_MEMORY_DATA["parts"] and os.path.exists(frontend_catalog):
        try:
            with open(frontend_catalog, "r", encoding="utf-8") as f:
                raw_data = json.load(f)
                for key in IN_MEMORY_DATA.keys():
                    if key in raw_data and raw_data[key]:
                        IN_MEMORY_DATA[key] = raw_data[key]
            print(f"Loaded {len(IN_MEMORY_DATA['parts'])} fallback parts from frontend/src/catalog.json in memory.")
        except Exception as e:
            print(f"Error loading frontend/src/catalog.json fallback: {e}")

# Helper function to convert snake_case to camelCase
def to_camel(snake_str: str) -> str:
    components = snake_str.split('_')
    return components[0] + ''.join(x.title() for x in components[1:])

# Serialize SQLAlchemy models into camelCase dictionary formats matching Spring Boot's JSON structures
def serialize(obj: Any, visited: Optional[set] = None) -> Any:
    if obj is None:
        return None
    if visited is None:
        visited = set()
    if id(obj) in visited:
        return None  # Prevent recursion cycles
    visited.add(id(obj))

    if isinstance(obj, (int, str, float, bool)):
        return obj

    data = {}
    # Convert all columns to camelCase
    for col in obj.__table__.columns:
        val = getattr(obj, col.name)
        if isinstance(val, decimal.Decimal):
            val = float(val)
        elif isinstance(val, date):
            val = val.isoformat()
        data[to_camel(col.name)] = val

    # Include relationships selectively
    if hasattr(obj, 'system') and obj.system:
        data['system'] = serialize(obj.system, visited)
    if hasattr(obj, 'diagram') and obj.diagram:
        data['diagram'] = serialize(obj.diagram, visited)
    if hasattr(obj, 'brand') and obj.brand:
        data['brand'] = serialize(obj.brand, visited)
    if hasattr(obj, 'model') and obj.model:
        data['model'] = serialize(obj.model, visited)
    if hasattr(obj, 'part') and obj.part:
        data['part'] = serialize(obj.part, visited)
    if hasattr(obj, 'images') and obj.images:
        data['images'] = [serialize(img, visited) for img in obj.images]
    if hasattr(obj, 'compatible_models') and obj.compatible_models:
        data['compatibleModels'] = [serialize(m, visited) for m in obj.compatible_models]
    if hasattr(obj, 'child_part') and obj.child_part:
        data['childPart'] = serialize(obj.child_part, visited)
    if hasattr(obj, 'parent_part') and obj.parent_part:
        data['parentPart'] = serialize(obj.parent_part, visited)
    if hasattr(obj, 'kit') and obj.kit:
        data['kit'] = serialize(obj.kit, visited)

    visited.remove(id(obj))
    return data

# Serialize Python dictionaries recursively to camelCase for in-memory mode output
def serialize_dict(d: Any, visited: Optional[set] = None) -> Any:
    if d is None:
        return None
    if isinstance(d, (int, str, float, bool)):
        return d
    if isinstance(d, list):
        return [serialize_dict(item, visited) for item in d]
    if isinstance(d, dict):
        if visited is None:
            visited = set()
        dict_id = id(d)
        if dict_id in visited:
            return None
        visited.add(dict_id)

        camel_dict = {}
        for k, v in d.items():
            camel_dict[to_camel(k)] = serialize_dict(v, visited)

        visited.remove(dict_id)
        return camel_dict
    return d

# Helper to enrich in-memory parts dictionaries
def enrich_in_memory_part(p: Dict[str, Any]) -> Dict[str, Any]:
    p_copy = p.copy()
    p_copy["system"] = next((s for s in IN_MEMORY_DATA["systems"] if s["id"] == p_copy.get("system_id")), None)
    p_copy["diagram"] = next((d for d in IN_MEMORY_DATA["exploded_diagrams"] if d["id"] == p_copy.get("diagram_id")), None)
    
    comp_model_ids = [c["model_id"] for c in IN_MEMORY_DATA["compatibility"] if c["part_id"] == p_copy["id"]]
    p_copy["compatible_models"] = [m for m in IN_MEMORY_DATA["models"] if m["id"] in comp_model_ids]
    
    # Attach brand relationship info inside compatible models if available
    for model in p_copy["compatible_models"]:
        model["brand"] = next((b for b in IN_MEMORY_DATA["brands"] if b["id"] == model.get("brand_id")), None)

    p_copy["images"] = [img for img in IN_MEMORY_DATA["part_images"] if img["part_id"] == p_copy["id"]]
    return p_copy

# --- PARTS ENDPOINTS ---

@app.get("/api/parts")
def get_all_parts(search: Optional[str] = None, db: Session = Depends(get_db)):
    if not db_available:
        parts = IN_MEMORY_DATA["parts"]
        if search and search.strip():
            search_term = search.strip().lower()
            parts = [
                p for p in parts
                if search_term in p.get("part_number", "").lower() or
                   search_term in p.get("name", "").lower() or
                   search_term in p.get("normalized_name", "").lower()
            ]
        return [serialize_dict(enrich_in_memory_part(p)) for p in parts]

    if search and search.strip():
        search_term = search.strip()
        parts = db.query(models.Part).filter(
            or_(
                models.Part.part_number.ilike(f"%{search_term}%"),
                models.Part.name.ilike(f"%{search_term}%"),
                models.Part.normalized_name.ilike(f"%{search_term}%")
            )
        ).all()
    else:
        parts = db.query(models.Part).all()
    return [serialize(p) for p in parts]

@app.get("/api/parts/search")
def search_parts(query: str, db: Session = Depends(get_db)):
    if not db_available:
        term = query.strip().lower()
        parts = [
            p for p in IN_MEMORY_DATA["parts"]
            if term in p.get("part_number", "").lower() or
               term in p.get("name", "").lower() or
               term in p.get("normalized_name", "").lower()
        ]
        return [serialize_dict(enrich_in_memory_part(p)) for p in parts]

    parts = db.query(models.Part).filter(
        or_(
            models.Part.part_number.ilike(f"%{query}%"),
            models.Part.name.ilike(f"%{query}%"),
            models.Part.normalized_name.ilike(f"%{query}%")
        )
    ).all()
    return [serialize(p) for p in parts]

@app.get("/api/parts/{id}")
def get_part_by_id(id: int, db: Session = Depends(get_db)):
    if not db_available:
        part = next((p for p in IN_MEMORY_DATA["parts"] if p["id"] == id), None)
        if not part:
            raise HTTPException(status_code=404, detail="Part not found")
        return serialize_dict(enrich_in_memory_part(part))

    part = db.query(models.Part).filter(models.Part.id == id).first()
    if not part:
        raise HTTPException(status_code=404, detail="Part not found")
    return serialize(part)

@app.get("/api/parts/number/{partNumber}")
def get_part_by_number(partNumber: str, db: Session = Depends(get_db)):
    if not db_available:
        part = next((p for p in IN_MEMORY_DATA["parts"] if p.get("part_number") == partNumber), None)
        if not part:
            raise HTTPException(status_code=404, detail="Part not found")
        return serialize_dict(enrich_in_memory_part(part))

    part = db.query(models.Part).filter(models.Part.part_number == partNumber).first()
    if not part:
        raise HTTPException(status_code=404, detail="Part not found")
    return serialize(part)

@app.get("/api/parts/{id}/related")
def get_related_parts(id: int, db: Session = Depends(get_db)):
    if not db_available:
        part = next((p for p in IN_MEMORY_DATA["parts"] if p["id"] == id), None)
        if not part:
            raise HTTPException(status_code=404, detail="Part not found")
        
        related = {}
        # Sibling parts in same kits
        child_relations = [r for r in IN_MEMORY_DATA["part_relationships"] if r["child_part_id"] == id]
        for cr in child_relations:
            siblings = [r for r in IN_MEMORY_DATA["part_relationships"] if r["kit_id"] == cr["kit_id"]]
            for s in siblings:
                if s["child_part_id"] != id:
                    sibling_part = next((p for p in IN_MEMORY_DATA["parts"] if p["id"] == s["child_part_id"]), None)
                    if sibling_part:
                        related[sibling_part["id"]] = sibling_part
            parent_part = next((p for p in IN_MEMORY_DATA["parts"] if p["id"] == cr["parent_part_id"]), None)
            if parent_part:
                related[parent_part["id"]] = parent_part

        # Children parts (if kit)
        parent_relations = [r for r in IN_MEMORY_DATA["part_relationships"] if r["parent_part_id"] == id]
        for pr in parent_relations:
            child_part = next((p for p in IN_MEMORY_DATA["parts"] if p["id"] == pr["child_part_id"]), None)
            if child_part:
                related[child_part["id"]] = child_part

        # Same system fallback
        if len(related) < 4 and part.get("system_id"):
            sys_parts = [p for p in IN_MEMORY_DATA["parts"] if p.get("system_id") == part["system_id"]]
            for sp in sys_parts:
                if sp["id"] != id:
                    related[sp["id"]] = sp
                if len(related) >= 8:
                    break
        return [serialize_dict(enrich_in_memory_part(p)) for p in related.values()]

    part = db.query(models.Part).filter(models.Part.id == id).first()
    if not part:
        raise HTTPException(status_code=404, detail="Part not found")

    related = {}
    child_relations = db.query(models.PartRelationship).filter(models.PartRelationship.child_part_id == id).all()
    for cr in child_relations:
        sibling_relations = db.query(models.PartRelationship).filter(models.PartRelationship.kit_id == cr.kit_id).all()
        for sr in sibling_relations:
            if sr.child_part_id != id:
                related[sr.child_part_id] = sr.child_part
        related[cr.parent_part_id] = cr.parent_part

    parent_relations = db.query(models.PartRelationship).filter(models.PartRelationship.parent_part_id == id).all()
    for pr in parent_relations:
        related[pr.child_part_id] = pr.child_part

    if len(related) < 4 and part.system_id:
        system_parts = db.query(models.Part).filter(models.Part.system_id == part.system_id).limit(20).all()
        for sp in system_parts:
            if sp.id != id:
                related[sp.id] = sp
            if len(related) >= 8:
                break
    return [serialize(p) for p in related.values()]

@app.post("/api/parts")
def create_or_update_part(part_data: Dict[str, Any], db: Session = Depends(get_db)):
    part_id = part_data.get("id")
    
    if not db_available:
        db_part = None
        if part_id:
            db_part = next((p for p in IN_MEMORY_DATA["parts"] if p["id"] == part_id), None)
        
        if not db_part:
            new_id = max([p["id"] for p in IN_MEMORY_DATA["parts"]]) + 1 if IN_MEMORY_DATA["parts"] else 1
            db_part = {"id": new_id}
            IN_MEMORY_DATA["parts"].append(db_part)

        db_part["part_number"] = part_data.get("partNumber", db_part.get("part_number", ""))
        db_part["name"] = part_data.get("name", db_part.get("name", ""))
        db_part["normalized_name"] = part_data.get("normalizedName", part_data.get("name", db_part.get("normalized_name", "")))
        db_part["category"] = part_data.get("category", db_part.get("category", ""))
        db_part["sub_system"] = part_data.get("subSystem", db_part.get("sub_system", ""))
        db_part["mrp"] = float(part_data.get("mrp", db_part.get("mrp", 0.0)))
        db_part["quantity"] = int(part_data.get("quantity", db_part.get("quantity", 1)))
        db_part["is_kit"] = bool(part_data.get("isKit", db_part.get("is_kit", False)))
        db_part["description"] = part_data.get("description", db_part.get("description", ""))
        db_part["oem_number"] = part_data.get("oemNumber", db_part.get("oem_number", ""))
        db_part["rack_location"] = part_data.get("rackLocation", db_part.get("rack_location", ""))
        db_part["reorder_level"] = int(part_data.get("reorderLevel", db_part.get("reorder_level", 5)))
        db_part["supplier"] = part_data.get("supplier", db_part.get("supplier", ""))
        db_part["dealer_price"] = float(part_data.get("dealerPrice", db_part.get("dealer_price", 0.0)))
        db_part["last_purchase_price"] = float(part_data.get("lastPurchasePrice", db_part.get("last_purchase_price", 0.0)))
        return serialize_dict(enrich_in_memory_part(db_part))

    db_part = None
    if part_id:
        db_part = db.query(models.Part).filter(models.Part.id == part_id).first()
    
    if not db_part:
        db_part = models.Part()
        db.add(db_part)

    db_part.part_number = part_data.get("partNumber", db_part.part_number)
    db_part.name = part_data.get("name", db_part.name)
    db_part.normalized_name = part_data.get("normalizedName", part_data.get("name", db_part.normalized_name))
    db_part.category = part_data.get("category", db_part.category)
    db_part.sub_system = part_data.get("subSystem", db_part.sub_system)
    db_part.mrp = part_data.get("mrp", db_part.mrp)
    db_part.quantity = part_data.get("quantity", db_part.quantity)
    db_part.is_kit = part_data.get("isKit", db_part.is_kit)
    db_part.description = part_data.get("description", db_part.description)
    db_part.oem_number = part_data.get("oemNumber", db_part.oem_number)
    db_part.rack_location = part_data.get("rackLocation", db_part.rack_location)
    db_part.reorder_level = part_data.get("reorderLevel", db_part.reorder_level)
    db_part.supplier = part_data.get("supplier", db_part.supplier)
    db_part.dealer_price = part_data.get("dealerPrice", db_part.dealer_price)
    db_part.last_purchase_price = part_data.get("lastPurchasePrice", db_part.last_purchase_price)

    db.commit()
    db.refresh(db_part)
    return serialize(db_part)

@app.delete("/api/parts/{id}")
def delete_part(id: int, db: Session = Depends(get_db)):
    if not db_available:
        part = next((p for p in IN_MEMORY_DATA["parts"] if p["id"] == id), None)
        if not part:
            raise HTTPException(status_code=404, detail="Part not found")
        IN_MEMORY_DATA["parts"].remove(part)
        return {"detail": "Part deleted successfully"}

    part = db.query(models.Part).filter(models.Part.id == id).first()
    if not part:
        raise HTTPException(status_code=404, detail="Part not found")
    db.delete(part)
    db.commit()
    return {"detail": "Part deleted successfully"}

# --- KITS ENDPOINTS ---

@app.get("/api/kits")
def get_all_kits(search: Optional[str] = None, db: Session = Depends(get_db)):
    if not db_available:
        kits = IN_MEMORY_DATA["kits"]
        if search and search.strip():
            search_term = search.strip().lower()
            kits = [k for k in kits if search_term in k.get("kit_number", "").lower() or search_term in k.get("name", "").lower()]
        
        enriched = []
        for k in kits:
            k_copy = k.copy()
            k_copy["part"] = next((p for p in IN_MEMORY_DATA["parts"] if p["id"] == k_copy.get("part_id")), None)
            enriched.append(k_copy)
        return [serialize_dict(k) for k in enriched]

    if search and search.strip():
        search_term = search.strip()
        kits = db.query(models.Kit).filter(
            or_(
                models.Kit.kit_number.ilike(f"%{search_term}%"),
                models.Kit.name.ilike(f"%{search_term}%")
            )
        ).all()
    else:
        kits = db.query(models.Kit).all()
    return [serialize(k) for k in kits]

@app.get("/api/kits/{id}")
def get_kit_by_id(id: int, db: Session = Depends(get_db)):
    if not db_available:
        kit = next((k for k in IN_MEMORY_DATA["kits"] if k["id"] == id), None)
        if not kit:
            raise HTTPException(status_code=404, detail="Kit not found")
        
        relations = [r for r in IN_MEMORY_DATA["part_relationships"] if r["kit_id"] == id]
        parent_part = next((p for p in IN_MEMORY_DATA["parts"] if p["id"] == kit.get("part_id")), None)
        
        child_parts = []
        for rel in relations:
            child_part = next((p for p in IN_MEMORY_DATA["parts"] if p["id"] == rel["child_part_id"]), None)
            if child_part:
                child_parts.append({
                    "relationshipId": rel["id"],
                    "part": serialize_dict(child_part),
                    "quantity": rel["quantity"]
                })
        
        return {
            "id": kit["id"],
            "kitNumber": kit["kit_number"],
            "name": kit["name"],
            "parentPart": serialize_dict(parent_part),
            "childParts": child_parts
        }

    kit = db.query(models.Kit).filter(models.Kit.id == id).first()
    if not kit:
        raise HTTPException(status_code=404, detail="Kit not found")

    relationships = db.query(models.PartRelationship).filter(models.PartRelationship.kit_id == id).all()

    response = {
        "id": kit.id,
        "kitNumber": kit.kit_number,
        "name": kit.name,
        "parentPart": serialize(kit.part),
        "childParts": []
    }

    for rel in relationships:
        child_info = {
            "relationshipId": rel.id,
            "part": serialize(rel.child_part),
            "quantity": rel.quantity
        }
        response["childParts"].append(child_info)

    return response

# --- SYSTEMS ENDPOINTS ---

@app.get("/api/systems")
def get_all_systems(db: Session = Depends(get_db)):
    if not db_available:
        return [serialize_dict(s) for s in IN_MEMORY_DATA["systems"]]
    systems = db.query(models.PartSystem).all()
    return [serialize(s) for s in systems]

@app.get("/api/systems/{id}")
def get_system_by_id(id: int, db: Session = Depends(get_db)):
    if not db_available:
        system = next((s for s in IN_MEMORY_DATA["systems"] if s["id"] == id), None)
        if not system:
            raise HTTPException(status_code=404, detail="System not found")
        parts = [p for p in IN_MEMORY_DATA["parts"] if p.get("system_id") == id]
        return {
            "id": system["id"],
            "name": system["name"],
            "description": system["description"],
            "parts": [serialize_dict(p) for p in parts]
        }

    system = db.query(models.PartSystem).filter(models.PartSystem.id == id).first()
    if not system:
        raise HTTPException(status_code=404, detail="System not found")

    parts = db.query(models.Part).filter(models.Part.system_id == id).all()

    return {
        "id": system.id,
        "name": system.name,
        "description": system.description,
        "parts": [serialize(p) for p in parts]
    }

# --- BRANDS & MODELS ---

@app.get("/api/brands")
def get_all_brands(db: Session = Depends(get_db)):
    if not db_available:
        return [serialize_dict(b) for b in IN_MEMORY_DATA["brands"]]
    brands = db.query(models.Brand).all()
    return [serialize(b) for b in brands]

@app.post("/api/brands")
def create_brand(brand_data: Dict[str, Any], db: Session = Depends(get_db)):
    if not db_available:
        new_id = max([b["id"] for b in IN_MEMORY_DATA["brands"]]) + 1 if IN_MEMORY_DATA["brands"] else 1
        brand = {"id": new_id, "name": brand_data.get("name")}
        IN_MEMORY_DATA["brands"].append(brand)
        return serialize_dict(brand)

    brand = models.Brand(name=brand_data.get("name"))
    db.add(brand)
    db.commit()
    db.refresh(brand)
    return serialize(brand)

@app.get("/api/models")
def get_all_models(db: Session = Depends(get_db)):
    if not db_available:
        # Attach brand relationship info
        enriched = []
        for m in IN_MEMORY_DATA["models"]:
            m_copy = m.copy()
            m_copy["brand"] = next((b for b in IN_MEMORY_DATA["brands"] if b["id"] == m_copy.get("brand_id")), None)
            enriched.append(m_copy)
        return [serialize_dict(m) for m in enriched]

    models_list = db.query(models.Model).all()
    return [serialize(m) for m in models_list]

@app.post("/api/models")
def create_model(model_data: Dict[str, Any], db: Session = Depends(get_db)):
    if not db_available:
        new_id = max([m["id"] for m in IN_MEMORY_DATA["models"]]) + 1 if IN_MEMORY_DATA["models"] else 1
        model = {
            "id": new_id,
            "brand_id": model_data.get("brandId"),
            "family": model_data.get("family", "Commuter"),
            "name": model_data.get("name"),
            "variant": model_data.get("variant", "Standard"),
            "cc": model_data.get("cc", 100),
            "year": model_data.get("year", 2024)
        }
        IN_MEMORY_DATA["models"].append(model)
        # Attach brand details
        model_copy = model.copy()
        model_copy["brand"] = next((b for b in IN_MEMORY_DATA["brands"] if b["id"] == model_copy.get("brand_id")), None)
        return serialize_dict(model_copy)

    model = models.Model(
        brand_id=model_data.get("brandId"),
        family=model_data.get("family", "Commuter"),
        name=model_data.get("name"),
        variant=model_data.get("variant", "Standard"),
        cc=model_data.get("cc", 100),
        year=model_data.get("year", 2024)
    )
    db.add(model)
    db.commit()
    db.refresh(model)
    return serialize(model)

# --- EXPLODED DIAGRAMS ---

@app.get("/api/diagrams")
def get_all_diagrams(db: Session = Depends(get_db)):
    if not db_available:
        # Attach system and model relationships
        enriched = []
        for d in IN_MEMORY_DATA["exploded_diagrams"]:
            d_copy = d.copy()
            d_copy["system"] = next((s for s in IN_MEMORY_DATA["systems"] if s["id"] == d_copy.get("system_id")), None)
            d_copy["model"] = next((m for m in IN_MEMORY_DATA["models"] if m["id"] == d_copy.get("model_id")), None)
            enriched.append(d_copy)
        return [serialize_dict(d) for d in enriched]

    diagrams = db.query(models.ExplodedDiagram).all()
    return [serialize(d) for d in diagrams]

@app.get("/api/diagrams/{id}")
def get_diagram_by_id(id: int, db: Session = Depends(get_db)):
    if not db_available:
        diagram = next((d for d in IN_MEMORY_DATA["exploded_diagrams"] if d["id"] == id), None)
        if not diagram:
            raise HTTPException(status_code=404, detail="Diagram not found")
        d_copy = diagram.copy()
        d_copy["system"] = next((s for s in IN_MEMORY_DATA["systems"] if s["id"] == d_copy.get("system_id")), None)
        d_copy["model"] = next((m for m in IN_MEMORY_DATA["models"] if m["id"] == d_copy.get("model_id")), None)
        return serialize_dict(d_copy)

    diagram = db.query(models.ExplodedDiagram).filter(models.ExplodedDiagram.id == id).first()
    if not diagram:
        raise HTTPException(status_code=404, detail="Diagram not found")
    return serialize(diagram)

# --- RAG AI CHAT ENDPOINT ---

@app.post("/api/chat")
def chat_assistant(payload: Dict[str, str] = Body(...), db: Session = Depends(get_db)):
    message = payload.get("message", "").strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    words = [w for w in message.replace("?", "").replace(",", "").split() if len(w) > 2]
    
    # 1. Search matching parts in database OR in-memory index
    matching_parts = []
    
    if db_available:
        if words:
            filters = []
            for word in words:
                filters.append(models.Part.part_number.ilike(f"%{word}%"))
                filters.append(models.Part.name.ilike(f"%{word}%"))
                filters.append(models.Part.normalized_name.ilike(f"%{word}%"))
            matching_parts = db.query(models.Part).filter(or_(*filters)).limit(5).all()
            
        db_context_list = []
        if matching_parts:
            db_context_list.append("Relevant Parts in Inventory Database:")
            for part in matching_parts:
                compat = ", ".join([m.name for m in part.compatible_models[:3]])
                db_context_list.append(
                    f"- Part Number: {part.part_number}\n"
                    f"  Name: {part.normalized_name}\n"
                    f"  MRP: ₹{float(part.mrp)}\n"
                    f"  Rack Location: {part.rack_location}\n"
                    f"  In Stock Qty: {part.quantity}\n"
                    f"  Compatible Bikes: {compat or 'Not Mapped'}"
                )
        db_context = "\n".join(db_context_list) if db_context_list else "No matching parts found in inventory database."
        ai_response = rag_engine.answer_question(message, db_context)
        
        return {
            "reply": ai_response,
            "items": [serialize(p) for p in matching_parts]
        }
    else:
        # In-Memory Search
        if words:
            for part in IN_MEMORY_DATA["parts"]:
                p_num = part.get("part_number", "").lower()
                p_name = part.get("name", "").lower()
                p_norm = part.get("normalized_name", "").lower()
                
                matches = False
                for word in words:
                    if word in p_num or word in p_name or word in p_norm:
                        matches = True
                        break
                if matches:
                    matching_parts.append(part)
                    if len(matching_parts) >= 5:
                        break
                        
        db_context_list = []
        if matching_parts:
            db_context_list.append("Relevant Parts in Catalog:")
            for part in matching_parts:
                db_context_list.append(
                    f"- Part Number: {part.get('part_number')}\n"
                    f"  Name: {part.get('normalized_name')}\n"
                    f"  MRP: ₹{part.get('mrp', 0.0)}\n"
                    f"  Rack Location: {part.get('rack_location', 'N/A')}\n"
                    f"  In Stock Qty: {part.get('quantity', 0)}"
                )
        db_context = "\n".join(db_context_list) if db_context_list else "No matching parts found in catalog."
        ai_response = rag_engine.answer_question(message, db_context)
        
        return {
            "reply": ai_response,
            "items": [serialize_dict(enrich_in_memory_part(p)) for p in matching_parts]
        }

