import chromadb
from app.core.config import settings

class ChromaHandler:
    def __init__(self):
        # Persistent storage setup taaki data save rahe
        self.client = chromadb.PersistentClient(path=settings.CHROMA_DB_PATH)
        # Collection jahan saara data jayega
        self.collection = self.client.get_or_create_collection(name="anatya_knowledge")

    def add_document(self, text, metadata, doc_id):
        self.collection.add(
            documents=[text],
            metadatas=[metadata],
            ids=[doc_id]
        )

    def search_context(self, query, n_results=5):
        # ChromaDB ko scan karke best pieces nikalna
        return self.collection.query(
            query_texts=[query],
            n_results=n_results
        )

db_manager = ChromaHandler()