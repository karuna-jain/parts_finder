import os
import json
import numpy as np
import pdfplumber
import google.generativeai as genai
from typing import List, Dict, Any, Tuple

CACHE_FILE = os.path.join(os.path.dirname(__file__), "rag_cache.json")
PDF_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "hero-bike-spare-parts copy.pdf")

# Setup Gemini API Key
api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)

class RAGEngine:
    def __init__(self):
        self.pages_text: List[str] = []
        self.embeddings: List[List[float]] = []
        self.initialized = False
        self.api_available = bool(api_key)

    def load_or_build_index(self, force_rebuild: bool = False):
        """Loads index cache if it exists, otherwise parses PDF and builds embeddings."""
        if not force_rebuild and os.path.exists(CACHE_FILE):
            try:
                print("Loading RAG cache from file...")
                with open(CACHE_FILE, "r", encoding="utf-8") as f:
                    cache_data = json.load(f)
                    self.pages_text = cache_data.get("texts", [])
                    self.embeddings = cache_data.get("embeddings", [])
                
                # Check if loaded cache is valid and contains embeddings
                if self.pages_text and (self.embeddings or not self.api_available):
                    self.initialized = True
                    print(f"RAG initialized with {len(self.pages_text)} pages.")
                    return
            except Exception as e:
                print(f"Failed to load RAG cache: {e}. Rebuilding...")

        # If cache invalid or force_rebuild, extract from PDF
        if not os.path.exists(PDF_PATH):
            print(f"Warning: PDF manual not found at {PDF_PATH}. RAG will be empty.")
            return

        print("Parsing PDF catalog manual. This may take a minute...")
        texts = []
        try:
            with pdfplumber.open(PDF_PATH) as pdf:
                for idx, page in enumerate(pdf.pages):
                    text = page.extract_text()
                    if text:
                        # Prepend page number metadata for reference
                        texts.append(f"--- Page {idx + 1} ---\n{text}")
            
            self.pages_text = texts
            self.embeddings = []
            
            if self.api_available and self.pages_text:
                print("Generating embeddings via Gemini API...")
                # Process in batches to prevent API rate limits
                batch_size = 20
                for i in range(0, len(self.pages_text), batch_size):
                    batch_texts = self.pages_text[i:i+batch_size]
                    # We strip the "--- Page X ---" header for embedding generation to keep it clean
                    clean_texts = [t.split("\n", 1)[-1] for t in batch_texts]
                    response = genai.embed_content(
                        model="models/text-embedding-004",
                        content=clean_texts,
                        task_type="retrieval_document"
                    )
                    self.embeddings.extend(response["embedding"])
                
                # Save cache to file
                print("Saving RAG index to cache file...")
                with open(CACHE_FILE, "w", encoding="utf-8") as f:
                    json.dump({"texts": self.pages_text, "embeddings": self.embeddings}, f)
            else:
                print("Warning: Gemini API Key not set. Embedding generation skipped. RAG will fall back to keyword search.")
                with open(CACHE_FILE, "w", encoding="utf-8") as f:
                    json.dump({"texts": self.pages_text, "embeddings": []}, f)
                    
            self.initialized = True
            print(f"RAG successfully initialized and indexed {len(self.pages_text)} pages.")
        except Exception as e:
            print(f"Error parsing PDF and generating embeddings: {e}")

    def cosine_similarity(self, a: np.ndarray, b: np.ndarray) -> np.ndarray:
        dot_product = np.dot(b, a)
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b, axis=1)
        return dot_product / (norm_a * norm_b)

    def retrieve(self, query: str, top_k: int = 3) -> List[Tuple[int, str, float]]:
        """Retrieves top_k relevant pages from the PDF."""
        if not self.initialized or not self.pages_text:
            return []

        # If API key and embeddings are available, perform vector similarity search
        if self.api_available and self.embeddings:
            try:
                response = genai.embed_content(
                    model="models/text-embedding-004",
                    content=query,
                    task_type="retrieval_query"
                )
                query_vector = np.array(response["embedding"])
                vectors = np.array(self.embeddings)
                
                similarities = self.cosine_similarity(query_vector, vectors)
                top_indices = np.argsort(similarities)[::-1][:top_k]
                
                results = []
                for idx in top_indices:
                    results.append((int(idx), self.pages_text[idx], float(similarities[idx])))
                return results
            except Exception as e:
                print(f"Vector search failed, falling back to keyword search: {e}")

        # Fallback to simple keyword density search
        query_words = set(query.lower().split())
        results = []
        for idx, text in enumerate(self.pages_text):
            text_lower = text.lower()
            score = sum(1 for word in query_words if word in text_lower)
            if score > 0:
                results.append((idx, text, float(score)))
        
        # Sort by match score
        results.sort(key=lambda x: x[2], reverse=True)
        return results[:top_k]

    def answer_question(self, query: str, db_context: str = "") -> str:
        """Retrieves context and asks Gemini to generate an answer."""
        if not self.api_available:
            return ("The AI Assistant is currently in Offline Mode. Please configure a valid "
                    "`GEMINI_API_KEY` in the backend environment variables to enable the RAG Chat Engine.")

        # 1. Retrieve context from PDF
        retrieved = self.retrieve(query, top_k=3)
        pdf_context = "\n\n".join([item[1] for item in retrieved])

        # 2. Build the LLM prompt
        prompt = f"""You are the Motorcycle Parts Intelligence Assistant. You help parts dealers and mechanics locate parts, check compatibility, and find details using the provided context.

Context from the PDF Parts Catalog Manual:
{pdf_context}

Structured Inventory Database Info (if any):
{db_context}

User Question: {query}

Instructions:
1. Answer the question accurately using the context above. If you locate the parts, list their Part Numbers, Descriptions, and any prices or compatibility specifications mentioned.
2. Cite the PDF Manual page numbers when quoting information.
3. If the answer cannot be found in the context, use your general knowledge of Indian motorcycles but mention that it is based on general knowledge rather than the catalog manual.
4. Keep your answer professional, clear, and structured (using lists or bold text where appropriate).
"""
        
        try:
            model = genai.GenerativeModel("gemini-1.5-flash")
            response = model.generate_content(prompt)
            return response.text
        except Exception as e:
            return f"Error generating response from Gemini API: {str(e)}"

# Singleton RAG Engine Instance
rag_engine = RAGEngine()
