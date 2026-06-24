import os
import decimal
from datetime import date
from fastapi import FastAPI, Depends, HTTPException, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import or_
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional

from .database import get_db, engine, Base
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

# Ensure RAG is initialized on startup
@app.on_event("startup")
def startup_event():
    # Load RAG cache or parse PDF
    rag_engine.load_or_build_index()

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

# --- PARTS ENDPOINTS ---

@app.get("/api/parts")
def get_all_parts(search: Optional[str] = None, db: Session = Depends(get_db)):
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
    part = db.query(models.Part).filter(models.Part.id == id).first()
    if not part:
        raise HTTPException(status_code=404, detail="Part not found")
    return serialize(part)

@app.get("/api/parts/number/{partNumber}")
def get_part_by_number(partNumber: str, db: Session = Depends(get_db)):
    part = db.query(models.Part).filter(models.Part.part_number == partNumber).first()
    if not part:
        raise HTTPException(status_code=404, detail="Part not found")
    return serialize(part)

@app.get("/api/parts/{id}/related")
def get_related_parts(id: int, db: Session = Depends(get_db)):
    part = db.query(models.Part).filter(models.Part.id == id).first()
    if not part:
        raise HTTPException(status_code=404, detail="Part not found")

    related = {}

    # 1. Get sibling parts (from the same kits)
    child_relations = db.query(models.PartRelationship).filter(models.PartRelationship.child_part_id == id).all()
    for cr in child_relations:
        sibling_relations = db.query(models.PartRelationship).filter(models.PartRelationship.kit_id == cr.kit_id).all()
        for sr in sibling_relations:
            if sr.child_part_id != id:
                related[sr.child_part_id] = sr.child_part
        related[cr.parent_part_id] = cr.parent_part

    # 2. Get children parts (if this part is a kit)
    parent_relations = db.query(models.PartRelationship).filter(models.PartRelationship.parent_part_id == id).all()
    for pr in parent_relations:
        related[pr.child_part_id] = pr.child_part

    # 3. Fallback: Add parts from same system/category
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
    # Safely convert camelCase properties from frontend payload to snake_case for DB
    part_id = part_data.get("id")
    
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
    part = db.query(models.Part).filter(models.Part.id == id).first()
    if not part:
        raise HTTPException(status_code=404, detail="Part not found")
    db.delete(part)
    db.commit()
    return {"detail": "Part deleted successfully"}

# --- KITS ENDPOINTS ---

@app.get("/api/kits")
def get_all_kits(search: Optional[str] = None, db: Session = Depends(get_db)):
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
    systems = db.query(models.PartSystem).all()
    return [serialize(s) for s in systems]

@app.get("/api/systems/{id}")
def get_system_by_id(id: int, db: Session = Depends(get_db)):
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
    brands = db.query(models.Brand).all()
    return [serialize(b) for b in brands]

@app.post("/api/brands")
def create_brand(brand_data: Dict[str, Any], db: Session = Depends(get_db)):
    brand = models.Brand(name=brand_data.get("name"))
    db.add(brand)
    db.commit()
    db.refresh(brand)
    return serialize(brand)

@app.get("/api/models")
def get_all_models(db: Session = Depends(get_db)):
    models_list = db.query(models.Model).all()
    return [serialize(m) for m in models_list]

@app.post("/api/models")
def create_model(model_data: Dict[str, Any], db: Session = Depends(get_db)):
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
    diagrams = db.query(models.ExplodedDiagram).all()
    return [serialize(d) for d in diagrams]

@app.get("/api/diagrams/{id}")
def get_diagram_by_id(id: int, db: Session = Depends(get_db)):
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

    # Construct structured DB context matching words in the user query
    db_context_list = []
    
    # Simple query sanitization for search
    words = [w for w in message.replace("?", "").replace(",", "").split() if len(w) > 2]
    
    # 1. Search database parts matching query terms
    matching_parts = []
    if words:
        filters = []
        for word in words:
            filters.append(models.Part.part_number.ilike(f"%{word}%"))
            filters.append(models.Part.name.ilike(f"%{word}%"))
            filters.append(models.Part.normalized_name.ilike(f"%{word}%"))
        
        matching_parts = db.query(models.Part).filter(or_(*filters)).limit(5).all()

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
            
    # Combine structured database facts
    db_context = "\n".join(db_context_list) if db_context_list else "No matching parts found in the inventory database."

    # Query RAG engine using PDF manual + DB context
    ai_response = rag_engine.answer_question(message, db_context)
    
    # Return matching items to render in UI as rich component previews
    rich_items = []
    for part in matching_parts:
        rich_items.append(serialize(part))
        
    return {
        "reply": ai_response,
        "items": rich_items
    }
