# ClinBridge AI: NAMASTE to ICD-11 & FHIR

![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![Postgres](https://img.shields.io/badge/postgres-%23316192.svg?style=for-the-badge&logo=postgresql&logoColor=white)
![scikit-learn](https://img.shields.io/badge/scikit--learn-%23F7931E.svg?style=for-the-badge&logo=scikit-learn&logoColor=white)

ClinBridge AI is an intelligent healthcare interoperability platform designed to bridge the gap between traditional Ayurveda terminology (NAMASTE) and modern Western biomedicine (WHO ICD-11). It provides a full-stack solution to search Ayurveda diagnoses, semantically map them to ICD-11 entities using NLP, and generate HL7 FHIR-compliant transaction bundles.

## Features

1. **Intelligent Clinical Search**: Fast, API-driven search for NAMASTE Ayurveda codes.
2. **Automated AI Mapping Pipeline**: 
   - A background AI agent queries the WHO ICD-11 live API for potential terminology matches.
   - Utilizes `scikit-learn` TF-IDF Cosine Similarity (NLP) to mathematically score the semantic overlap between the Ayurveda and Western disease definitions.
3. **Medical Expert Dashboard**: A dedicated UI for medical professionals to review the AI's proposed terminology mappings and officially approve them into the hospital's database.
4. **FHIR R4 Bundle Generation**: Once a diagnosis is mapped and selected, the system generates a standard FHIR Transaction Bundle containing Patient and dual-coded Condition resources, ready to be transmitted to modern EHRs.

## Architecture

* **Backend**: FastAPI (Python 3.13)
* **Database**: PostgreSQL (via SQLAlchemy ORM)
* **AI/NLP**: `scikit-learn` for semantic similarity scoring
* **Frontend**: React 19 (Vite) with a premium dark-mode, glassmorphic UI.

## Project Structure

```text
ClinBridge AI/
├── backend/            # FastAPI Backend
│   ├── app/            # Application logic, routes, and models
│   ├── scripts/        # Database initialization & AI mapping scripts
│   ├── tests/          # Pytest cases
│   └── requirements.txt
├── frontend/           # React 19 + Vite Frontend
│   ├── public/         # Static assets
│   ├── src/            # React components, pages, and hooks
│   └── package.json    
├── data/               # Datasets and raw files
├── docs/               # Project documentation
├── .env                # Local environment variables
├── .env.example        # Sample environment variables for GitHub
└── .gitignore          # Global git ignore configurations
```

## Setup Instructions

### 1. Database Setup
You must have PostgreSQL running locally on port 5432.
1. Create a database named `clinbridge` in pgAdmin.
2. Copy the `.env.example` file to `.env` in the project root and fill in your details:
```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/clinbridge
WHO_CLIENT_ID=your_who_api_client_id
WHO_CLIENT_SECRET=your_who_api_client_secret
```

### 2. Backend Setup
1. Create a virtual environment and install dependencies:
```bash
python -m venv venv
venv\Scripts\activate
pip install -r backend/requirements.txt
```
2. Seed the database with the initial WHO codes and NAMASTE terminology:
```bash
python scripts/database/init_db.py
python scripts/database/seed_namaste.py
```
3. Start the FastAPI server:
```bash
uvicorn backend.app.main:app --reload
```

### 3. Frontend Setup
Open a second terminal window:
```bash
cd frontend
npm install
npm run dev
```

### 4. Running the AI Auto-Mapper
To have the AI automatically search for unmapped Ayurveda codes and propose ICD-11 matches for you to review in the dashboard:
```bash
python backend/scripts/mapping/auto_mapper.py
```

## Usage
1. Open `http://localhost:5173` in your browser.
2. Go to the **Expert Review Dashboard** to approve any AI-generated mappings.
3. Go to the **Clinical Search** tab, search for the disease (e.g., "Jwara"), and click on it to see the verified translations.
4. Fill in the Patient Data and click **Generate FHIR Bundle** to view the interoperable JSON output!

---
*Built for College Mini Project 2026*
