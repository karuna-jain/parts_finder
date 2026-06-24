import os
import sys
from dotenv import load_dotenv

# Add current folder to sys.path so we can import rag_engine
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

# Load local environment variables (like GEMINI_API_KEY)
load_dotenv()

from backend_python.rag_engine import rag_engine

def main():
    print("Starting pre-extraction utility to index PDF manual and cache embeddings...")
    
    # Check if GEMINI_API_KEY is available
    if not os.getenv("GEMINI_API_KEY"):
        print("Error: GEMINI_API_KEY is not set in environment variables.")
        print("Please export GEMINI_API_KEY or set it in your environment before running this script.")
        sys.exit(1)
        
    # Rebuild index and save to cache
    rag_engine.load_or_build_index(force_rebuild=True)
    print("Pre-extraction complete. 'rag_cache.json' has been created and saved successfully.")

if __name__ == "__main__":
    main()
