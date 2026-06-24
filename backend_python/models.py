from sqlalchemy import Column, Integer, String, Boolean, Numeric, Date, ForeignKey, Table, Text
from sqlalchemy.orm import relationship
from .database import Base

# Association Table for Many-to-Many relationship between Parts and Models
compatibility_association = Table(
    'compatibility',
    Base.metadata,
    Column('id', Integer, primary_key=True, autoincrement=True),
    Column('part_id', Integer, ForeignKey('parts.id', ondelete='CASCADE')),
    Column('model_id', Integer, ForeignKey('models.id', ondelete='CASCADE'))
)

class Brand(Base):
    __tablename__ = 'brands'

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False, unique=True)
    
    models = relationship("Model", back_populates="brand", cascade="all, delete-orphan")

class Model(Base):
    __tablename__ = 'models'

    id = Column(Integer, primary_key=True, autoincrement=True)
    brand_id = Column(Integer, ForeignKey('brands.id', ondelete='CASCADE'), nullable=False)
    family = Column(String(100), nullable=False, default='Commuter')
    name = Column(String(100), nullable=False)
    variant = Column(String(100), nullable=False, default='Standard')
    cc = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)

    brand = relationship("Brand", back_populates="models")
    diagrams = relationship("ExplodedDiagram", back_populates="model")
    parts = relationship("Part", secondary=compatibility_association, back_populates="compatible_models")

class PartSystem(Base):
    __tablename__ = 'systems'

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False, unique=True)
    description = Column(Text)

    parts = relationship("Part", back_populates="system")
    diagrams = relationship("ExplodedDiagram", back_populates="system")

class ExplodedDiagram(Base):
    __tablename__ = 'exploded_diagrams'

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False, unique=True)
    svg_data = Column(Text, name="svg_data")
    system_id = Column(Integer, ForeignKey('systems.id', ondelete='SET NULL'))
    model_id = Column(Integer, ForeignKey('models.id', ondelete='SET NULL'))

    system = relationship("PartSystem", back_populates="diagrams")
    model = relationship("Model", back_populates="diagrams")
    parts = relationship("Part", back_populates="diagram")

class Part(Base):
    __tablename__ = 'parts'

    id = Column(Integer, primary_key=True, autoincrement=True)
    part_number = Column(String(50), nullable=False, unique=True)
    name = Column(String(255), nullable=False)
    normalized_name = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False)
    system_id = Column(Integer, ForeignKey('systems.id', ondelete='SET NULL'))
    sub_system = Column(String(100), default='General Assembly')
    confidence = Column(Numeric(3, 2), default=1.0)
    mrp = Column(Numeric(10, 2), nullable=False, default=0.00)
    quantity = Column(Integer, nullable=False, default=1)
    is_kit = Column(Boolean, nullable=False, default=False)
    description = Column(Text)
    diagram_id = Column(Integer, ForeignKey('exploded_diagrams.id', ondelete='SET NULL'))
    hotspot_number = Column(Integer)
    oem_number = Column(String(50))
    rack_location = Column(String(50), default='RACK-A1')
    reorder_level = Column(Integer, default=5)
    supplier = Column(String(100), default='OEM Direct')
    last_purchase_date = Column(Date)
    last_purchase_price = Column(Numeric(10, 2), default=0.00)
    dealer_price = Column(Numeric(10, 2), default=0.00)
    sales_history = Column(Text)
    superseded_by = Column(String(50))
    alternatives = Column(String(255))

    system = relationship("PartSystem", back_populates="parts")
    diagram = relationship("ExplodedDiagram", back_populates="parts")
    images = relationship("PartImage", back_populates="part", cascade="all, delete-orphan")
    compatible_models = relationship("Model", secondary=compatibility_association, back_populates="parts")

class Kit(Base):
    __tablename__ = 'kits'

    id = Column(Integer, primary_key=True, autoincrement=True)
    part_id = Column(Integer, ForeignKey('parts.id', ondelete='CASCADE'), nullable=False)
    kit_number = Column(String(50), nullable=False, unique=True)
    name = Column(String(255), nullable=False)

    part = relationship("Part", uselist=False)

class PartImage(Base):
    __tablename__ = 'part_images'

    id = Column(Integer, primary_key=True, autoincrement=True)
    part_id = Column(Integer, ForeignKey('parts.id', ondelete='CASCADE'), nullable=False)
    image_url = Column(String(255), nullable=False)

    part = relationship("Part", back_populates="images")

class PartRelationship(Base):
    __tablename__ = 'part_relationships'

    id = Column(Integer, primary_key=True, autoincrement=True)
    kit_id = Column(Integer, ForeignKey('kits.id', ondelete='CASCADE'), nullable=False)
    parent_part_id = Column(Integer, ForeignKey('parts.id', ondelete='CASCADE'), nullable=False)
    child_part_id = Column(Integer, ForeignKey('parts.id', ondelete='CASCADE'), nullable=False)
    quantity = Column(Integer, nullable=False, default=1)

    kit = relationship("Kit")
    parent_part = relationship("Part", foreign_keys=[parent_part_id])
    child_part = relationship("Part", foreign_keys=[child_part_id])
