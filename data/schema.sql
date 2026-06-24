-- Motorcycle Parts Knowledge Platform - DDL Schema
-- For PostgreSQL Database

-- 1. Brands Table
CREATE TABLE IF NOT EXISTS brands (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

-- 2. Models Table
CREATE TABLE IF NOT EXISTS models (
    id SERIAL PRIMARY KEY,
    brand_id INT REFERENCES brands(id) ON DELETE CASCADE,
    family VARCHAR(100) NOT NULL DEFAULT 'Commuter',
    name VARCHAR(100) NOT NULL,
    variant VARCHAR(100) NOT NULL DEFAULT 'Standard',
    cc INT NOT NULL,
    year INT NOT NULL,
    CONSTRAINT unique_model_year UNIQUE (brand_id, name, variant, year)
);

-- 3. Systems Table (Categories)
CREATE TABLE IF NOT EXISTS systems (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT
);

-- 4. Exploded Diagrams Table
CREATE TABLE IF NOT EXISTS exploded_diagrams (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    svg_data TEXT,
    system_id INT REFERENCES systems(id) ON DELETE SET NULL,
    model_id INT REFERENCES models(id) ON DELETE SET NULL
);

-- 5. Parts Table
CREATE TABLE IF NOT EXISTS parts (
    id SERIAL PRIMARY KEY,
    part_number VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    normalized_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    system_id INT REFERENCES systems(id) ON DELETE SET NULL,
    sub_system VARCHAR(100) DEFAULT 'General Assembly',
    confidence NUMERIC(3, 2) DEFAULT 1.0,
    mrp NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    quantity INT NOT NULL DEFAULT 1,
    is_kit BOOLEAN NOT NULL DEFAULT FALSE,
    description TEXT,
    
    -- Hierarchical & Exploded Diagram Integration
    diagram_id INT REFERENCES exploded_diagrams(id) ON DELETE SET NULL,
    hotspot_number INT,
    
    -- Inventory & Costing Details
    oem_number VARCHAR(50),
    rack_location VARCHAR(50) DEFAULT 'RACK-A1',
    reorder_level INT DEFAULT 5,
    supplier VARCHAR(100) DEFAULT 'OEM Direct',
    last_purchase_date DATE DEFAULT CURRENT_DATE,
    last_purchase_price NUMERIC(10, 2) DEFAULT 0.00,
    dealer_price NUMERIC(10, 2) DEFAULT 0.00,
    sales_history TEXT, -- comma-separated sales counts: '12,14,10,15,18,9,20,11,14,16,13,15'
    
    -- Part Relationships
    superseded_by VARCHAR(50),
    alternatives VARCHAR(255)
);

-- 6. Kits Table
CREATE TABLE IF NOT EXISTS kits (
    id SERIAL PRIMARY KEY,
    part_id INT NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
    kit_number VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL
);

-- 7. Part Images Table
CREATE TABLE IF NOT EXISTS part_images (
    id SERIAL PRIMARY KEY,
    part_id INT REFERENCES parts(id) ON DELETE CASCADE,
    image_url VARCHAR(255) NOT NULL
);

-- 8. Part Relationships (Parent Kit -> Child Parts)
CREATE TABLE IF NOT EXISTS part_relationships (
    id SERIAL PRIMARY KEY,
    kit_id INT REFERENCES kits(id) ON DELETE CASCADE,
    parent_part_id INT REFERENCES parts(id) ON DELETE CASCADE,
    child_part_id INT REFERENCES parts(id) ON DELETE CASCADE,
    quantity INT NOT NULL DEFAULT 1,
    CONSTRAINT unique_kit_relationship UNIQUE (kit_id, parent_part_id, child_part_id)
);

-- 9. Compatibility Table (Parts/Kits -> Models)
CREATE TABLE IF NOT EXISTS compatibility (
    id SERIAL PRIMARY KEY,
    part_id INT REFERENCES parts(id) ON DELETE CASCADE,
    model_id INT REFERENCES models(id) ON DELETE CASCADE,
    CONSTRAINT unique_part_model_compatibility UNIQUE (part_id, model_id)
);

-- INDEXES & SEARCH OPTIMIZATIONS
CREATE INDEX idx_parts_part_number ON parts (part_number);
CREATE INDEX idx_parts_name ON parts (name);
CREATE INDEX idx_parts_normalized_name ON parts (normalized_name);
CREATE INDEX idx_models_brand_id ON models(brand_id);
CREATE INDEX idx_parts_system_id ON parts(system_id);
CREATE INDEX idx_kits_part_id ON kits(part_id);
CREATE INDEX idx_part_images_part_id ON part_images(part_id);
CREATE INDEX idx_part_relationships_kit_id ON part_relationships(kit_id);
CREATE INDEX idx_part_relationships_parent_part_id ON part_relationships(parent_part_id);
CREATE INDEX idx_part_relationships_child_part_id ON part_relationships(child_part_id);
CREATE INDEX idx_compatibility_part_id ON compatibility(part_id);
CREATE INDEX idx_compatibility_model_id ON compatibility(model_id);
