# 🏍️ Motorcycle Parts Finder & Knowledge Platform

A premium, interactive web application and knowledge platform designed to help users search, explore, and manage motorcycle spare parts, kits, systems, and exploded diagrams. This project integrates a robust Spring Boot Java backend, a modern React frontend with slick glassmorphism visuals, and data extraction scripts.

---

## 🚀 Key Features

*   **Interactive Exploded Diagrams**: Visual exploration of motorcycle assembly components with parts mapping and details.
*   **Comprehensive Parts Lookup**: Search and filter parts by part number, name, description, or system category.
*   **Kit & Parent-Child Relationships**: Track and view parent-child relationships between individual components and replacement assemblies/kits.
*   **Categorized Systems Directory**: Navigate through structured component hierarchies (Engine, Transmission, Electrical, Chassis, Braking, Wheels, etc.).
*   **Data Extraction & Seeding**: Automated scripts to parse raw spare parts PDF manuals, output clean structured JSON/CSV data, and populate PostgreSQL databases.

---

## 🛠️ Technology Stack

### Backend
*   **Java 22** & **Spring Boot 3.3.0**
*   **Spring Data JPA** for ORM and database persistence
*   **Spring Web** for RESTful API endpoints
*   **Lombok** for boilerplate reduction
*   **PostgreSQL** for the relational data store

### Frontend
*   **React 19.2.6** (built with **Vite 8.0.12**)
*   **Lucide React** for premium modern iconography
*   **Vanilla CSS** featuring custom variables, dark mode styling, and dynamic glassmorphism UI card micro-animations

### Scripts & Data
*   **Python** PDF catalog extraction and data parsing scripts
*   **PostgreSQL SQL Schemas & Seeds** for rapid deployment

---

## 📂 Repository Structure

```text
├── backend/                       # Spring Boot REST API
│   ├── src/main/java/             # Source code (Controllers, Services, Models, Repositories)
│   ├── src/main/resources/        # Application properties and SQL configs
│   └── pom.xml                    # Maven project configuration
├── frontend/                      # React SPA with Vite
│   ├── src/                       # Components, Assets, App views, CSS
│   │   ├── index.css              # Glassmorphic Design System & styling
│   │   ├── App.jsx                # Main parts application component
│   │   └── main.jsx               # Entry point
│   ├── index.html                 # HTML shell
│   ├── vite.config.js             # Vite configuration
│   └── package.json               # Node.js dependencies & scripts
├── scripts/                       # Data processing
│   └── extract_catalog.py         # Python catalog extractor & parser
├── data/                          # DB scripts and raw CSVs
│   ├── schema.sql                 # PostgreSQL DDL table definitions
│   ├── import_data.sql            # Core database seed records
│   ├── catalog.json               # Full catalog dataset
│   ├── parts.csv                  # Individual spare parts
│   ├── kits.csv                   # Part kits listings
│   └── kit_parts.csv              # Kit-to-part mapping relationships
├── hero-bike-spare-parts copy.pdf # Raw motorcycle parts manual (source doc)
└── .gitignore                     # Global project git exclusions
```

---

## ⚙️ Installation & Getting Started

### 1. Database Setup
Ensure you have **PostgreSQL** installed and running on your local machine.

1. Connect to PostgreSQL and create a database named `motorcycle_parts`:
   ```sql
   CREATE DATABASE motorcycle_parts;
   ```
2. Import the database schema:
   ```bash
   psql -d motorcycle_parts -f data/schema.sql
   ```
3. Load the initial catalog data:
   ```bash
   psql -d motorcycle_parts -f data/import_data.sql
   ```

### 2. Backend Setup (Spring Boot)
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Open `src/main/resources/application.properties` and verify/update your PostgreSQL connection details (username, password, and port).
3. Build and run the Spring Boot application using Maven:
   ```bash
   ./mvnw spring-boot:run
   ```
   The backend API server will start on port `8082` (`http://localhost:8082/api`).

### 3. Frontend Setup (React + Vite)
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
   The frontend UI will be accessible in your browser (typically at `http://localhost:5173`).

---

## 📡 REST API Reference

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/parts` | `GET` | Retrieve list of all parts. Supports optional `?search=` parameter |
| `/api/parts/{id}` | `GET` | Get details of a specific part by internal ID |
| `/api/parts/number/{partNumber}` | `GET` | Get details of a part using its exact part number |
| `/api/parts/{id}/related` | `GET` | Get related parts |
| `/api/kits` | `GET` | List all parts kits. Supports optional `?search=` parameter |
| `/api/kits/{id}` | `GET` | Get detailed parent-child relationships and component list for a kit |
| `/api/systems` | `GET` | List all engine/chassis categories and systems |
| `/api/systems/{id}` | `GET` | Fetch all parts associated with a specific system |
| `/api/brands` | `GET` | List all brands (e.g., Hero) |
| `/api/models` | `GET` | List all models (e.g., Splendor, Passion) |
| `/api/diagrams` | `GET` | List all available exploded diagrams |
| `/api/diagrams/{id}` | `GET` | Fetch metadata and image mapping for a single exploded diagram |

---

## 🤖 Data Extraction Scripts

A Python script is included to parse spare parts data directly from PDF files:
*   File: `scripts/extract_catalog.py`
*   **Requirements**: Python 3.8+ with packages such as `pdfplumber` or `pypdf` depending on parsing target details.
*   **Features**: Parses the catalog PDF, classifies parts into category systems, resolves relationships, and generates SQL INSERT scripts as well as CSV formats found in the `data/` folder.
