import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Retrieve database URL from environment or fallback
database_url = os.getenv("SPRING_DATASOURCE_URL")

if not database_url:
    # If no URL is provided, reconstruct it from individual properties or local defaults
    db_user = os.getenv("SPRING_DATASOURCE_USERNAME", "postgres")
    db_pass = os.getenv("SPRING_DATASOURCE_PASSWORD", "password")
    db_host = os.getenv("SPRING_DATASOURCE_HOST", "localhost")
    db_port = os.getenv("SPRING_DATASOURCE_PORT", "5432")
    db_name = os.getenv("SPRING_DATASOURCE_NAME", "motorcycle_parts")
    database_url = f"postgresql://{db_user}:{db_pass}@{db_host}:{db_port}/{db_name}"
else:
    # If the URL is a Java JDBC URL, convert it to standard PostgreSQL URI format
    if database_url.startswith("jdbc:postgresql://"):
        database_url = database_url.replace("jdbc:postgresql://", "postgresql://")

# Try configuring SQLAlchemy connection engine
db_available = False
engine = None
SessionLocal = None

try:
    engine = create_engine(database_url, pool_pre_ping=True)
    # Test connection
    with engine.connect() as conn:
        db_available = True
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    print("PostgreSQL Database connected successfully.")
except Exception as e:
    print(f"Warning: PostgreSQL Database not available ({e}). Running in In-Memory fallback mode.")

Base = declarative_base()

def get_db():
    if not db_available or SessionLocal is None:
        yield None
        return
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
