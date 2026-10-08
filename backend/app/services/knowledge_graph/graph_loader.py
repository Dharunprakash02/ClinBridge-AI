import os
import re
import pandas as pd
import logging
from typing import Optional, List, Dict
from sqlalchemy.orm import Session

from backend.app.services.knowledge_graph.graph_schema import (
    NodeType, RelationshipType, GraphNode, GraphEdge
)
from backend.app.services.knowledge_graph.graph_repository import kg_repository, KnowledgeGraphRepository
from backend.app.db.database import SessionLocal
from backend.app.db.models import NamasteCode, HybridMappingResult

logger = logging.getLogger(__name__)

# Standard symptom extraction patterns for clinical terms and definitions
SYMPTOM_LEXICON = {
    "fever": ["fever", "pyrexia", "jwara", "temperature", "heat"],
    "headache": ["headache", "shirashoola", "cephalalgia"],
    "cough": ["cough", "kasa", "expectoration", "catarrh"],
    "dyspnea": ["dyspnea", "breathlessness", "shwasa", "difficult breathing"],
    "pain": ["pain", "shoola", "ache", "colic"],
    "inflammation": ["inflammation", "shotha", "swelling", "edema"],
    "diarrhea": ["diarrhea", "atisaara", "loose stools", "dysentery"],
    "vomiting": ["vomiting", "chhardi", "emesis"],
    "insomnia": ["insomnia", "anidra", "sleeplessness"],
    "fatigue": ["fatigue", "exhaustion", "klama", "debility", "weakness"],
    "burning_sensation": ["burning sensation", "daha"],
    "thirst": ["thirst", "trishna", "polydipsia"],
    "anorexia": ["anorexia", "aruchi", "loss of appetite"],
    "itching": ["itching", "kandu", "pruritus"],
    "abdominal_distension": ["abdominal pain", "fullness of abdomen", "gaseous movements", "flatulence"]
}

DOSHA_LEXICON = {
    "Vata": ["vata", "vāta", "vayu", "vātadosha"],
    "Pitta": ["pitta", "pittadosha"],
    "Kapha": ["kapha", "shleshma", "kaphadosha"],
    "Sannipata": ["sannipata", "sannipātaja", "tridosha"]
}

def extract_symptoms(text: str) -> List[str]:
    if not text or not isinstance(text, str):
        return []
    text_lower = text.lower()
    matched_symptoms = []
    for symptom_name, keywords in SYMPTOM_LEXICON.items():
        for kw in keywords:
            if re.search(r'\b' + re.escape(kw) + r'\b', text_lower):
                matched_symptoms.append(symptom_name)
                break
    return matched_symptoms

def extract_doshas(text: str) -> List[str]:
    if not text or not isinstance(text, str):
        return []
    text_lower = text.lower()
    matched_doshas = []
    for dosha_name, keywords in DOSHA_LEXICON.items():
        for kw in keywords:
            if re.search(r'\b' + re.escape(kw) + r'\b', text_lower):
                matched_doshas.append(dosha_name)
                break
    return matched_doshas

def load_knowledge_graph(repo: Optional[KnowledgeGraphRepository] = None, db: Optional[Session] = None) -> KnowledgeGraphRepository:
    """
    Populates the Knowledge Graph with Ayurveda concepts, symptoms, dosha relations,
    ICD-11 targets, and clinical evidence sources.
    """
    if repo is None:
        repo = kg_repository

    if repo.count_nodes() > 0:
        logger.info(f"Knowledge Graph already loaded with {repo.count_nodes()} nodes.")
        return repo

    logger.info("Initializing Knowledge Graph build...")

    # 1. Seed Core Dosha & Symptom Ontology Nodes
    for dosha in DOSHA_LEXICON.keys():
        repo.add_node(GraphNode(
            id=f"dosha_{dosha.lower()}",
            node_type=NodeType.DOSHA,
            label=dosha,
            properties={"category": "Dosha", "system": "Ayurveda"}
        ))

    for symptom in SYMPTOM_LEXICON.keys():
        repo.add_node(GraphNode(
            id=f"symptom_{symptom}",
            node_type=NodeType.SYMPTOM,
            label=symptom.replace("_", " ").title(),
            properties={"category": "Clinical Symptom"}
        ))

    # 2. Seed Default Clinical Evidence Source Nodes
    who_source = GraphNode(
        id="src_who_icd11",
        node_type=NodeType.EVIDENCE_SOURCE,
        label="WHO ICD-11 2026-01 Maintenance Release",
        properties={"publisher": "World Health Organization", "type": "Classification Standard"}
    )
    ayur_source = GraphNode(
        id="src_namaste_morbidity",
        node_type=NodeType.EVIDENCE_SOURCE,
        label="National Ayurveda Morbidity Codes (NAMASTE)",
        properties={"publisher": "Ministry of AYUSH, India", "type": "Terminology Standard"}
    )
    repo.add_node(who_source)
    repo.add_node(ayur_source)

    # 3. Ingest Concepts from Database or Processed CSV
    close_db = False
    if db is None:
        db = SessionLocal()
        close_db = True

    try:
        namaste_records = db.query(NamasteCode).all()
        if namaste_records:
            for rec in namaste_records:
                _ingest_namaste_record(repo, rec.namaste_code, rec.term, rec.long_definition or rec.short_definition or "")
        else:
            # Fallback to CSV if DB is empty
            csv_path = os.path.join(os.path.dirname(__file__), "../../../../data/processed/cleaned_ayurveda_dataset.csv")
            if os.path.exists(csv_path):
                df = pd.read_csv(csv_path)
                for _, row in df.iterrows():
                    code = str(row.get("namc_code", "")).strip()
                    term = str(row.get("namc_term", "")).strip()
                    definition = str(row.get("long_definition", "") if pd.notna(row.get("long_definition")) else "")
                    english_name = str(row.get("name_english", "") if pd.notna(row.get("name_english")) else "")
                    full_desc = f"{english_name}. {definition}".strip()
                    _ingest_namaste_record(repo, code, term, full_desc)

        # 4. Ingest Existing Mappings as MAPPED_TO edges
        hybrid_records = db.query(HybridMappingResult).all()
        for h in hybrid_records:
            if h.icd11_code and h.icd11_code != "NO_MATCH":
                icd_node_id = f"icd_{h.icd11_code}"
                if not repo.get_node(icd_node_id):
                    repo.add_node(GraphNode(
                        id=icd_node_id,
                        node_type=NodeType.ICD11_CONCEPT,
                        label=h.icd11_title or h.icd11_code,
                        properties={
                            "icd11_code": h.icd11_code,
                            "icd11_uri": h.icd11_uri,
                            "definition": h.icd11_definition or "",
                            "release": h.icd11_release
                        }
                    ))
                
                # Add MAPPED_TO edge
                repo.add_edge(GraphEdge(
                    source_id=f"namaste_{h.namaste_code}",
                    target_id=icd_node_id,
                    rel_type=RelationshipType.MAPPED_TO,
                    properties={
                        "relationship_type": h.relationship_type or "equivalent",
                        "confidence_level": h.confidence_level,
                        "final_score": h.final_score
                    }
                ))

    finally:
        if close_db:
            db.close()

    logger.info(f"Knowledge Graph successfully built: {repo.count_nodes()} nodes, {repo.count_edges()} edges.")
    return repo

def _ingest_namaste_record(repo: KnowledgeGraphRepository, code: str, term: str, definition: str):
    if not code or not term:
        return
    node_id = f"namaste_{code}"
    repo.add_node(GraphNode(
        id=node_id,
        node_type=NodeType.AYURVEDA_CONCEPT,
        label=term,
        properties={
            "code": code,
            "term": term,
            "definition": definition
        }
    ))

    # Link to NAMASTE Evidence Source
    repo.add_edge(GraphEdge(
        source_id=node_id,
        target_id="src_namaste_morbidity",
        rel_type=RelationshipType.SUPPORTED_BY,
        properties={"type": "standard_definition"}
    ))

    # Extract & Link Symptoms
    text_to_search = f"{term} {definition}"
    symptoms = extract_symptoms(text_to_search)
    for sym in symptoms:
        repo.add_edge(GraphEdge(
            source_id=node_id,
            target_id=f"symptom_{sym}",
            rel_type=RelationshipType.HAS_SYMPTOM,
            properties={"extracted_from": "definition"}
        ))

    # Extract & Link Doshas
    doshas = extract_doshas(text_to_search)
    for dosha in doshas:
        repo.add_edge(GraphEdge(
            source_id=node_id,
            target_id=f"dosha_{dosha.lower()}",
            rel_type=RelationshipType.RELATED_TO,
            properties={"association": "involved_dosha"}
        ))
