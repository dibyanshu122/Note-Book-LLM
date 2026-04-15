import os
import uuid
import re
import requests
from bs4 import BeautifulSoup
from pdfminer.high_level import extract_text
from youtube_transcript_api import YouTubeTranscriptApi
from app.db.chroma_handler import db_manager
from langchain_text_splitters import RecursiveCharacterTextSplitter

class IngestionService:
    def __init__(self):
        # Data ko chunks mein todne ke liye configuration
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=500, 
            chunk_overlap=50
        )

    def _save_to_db(self, text, source_name, source_type, user_id):
        """Helper function to split text and save to ChromaDB with User ID"""
        chunks = self.text_splitter.split_text(text)
        
        for i, chunk in enumerate(chunks):
            doc_id = f"{str(uuid.uuid4())}_{i}"
            metadata = {
                "source": source_name, 
                "type": source_type,
                "user_id": user_id,  # ✅ User identification metadata
                "chunk_index": i
            }
            db_manager.add_document(chunk, metadata, doc_id)
        return len(chunks)

    def process_pdf(self, file_path, user_id):
        """PDF extract karke specific user ke account mein save karega"""
        text = extract_text(file_path)
        num_chunks = self._save_to_db(text, os.path.basename(file_path), "pdf", user_id)
        return f"PDF Processed: {num_chunks} chunks saved for {user_id}."

    def process_url(self, url, user_id):
        """Website scrape karke specific user ke account mein save karega"""
        try:
            response = requests.get(url, timeout=10)
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Faltu elements (scripts/styles) hatao
            for script in soup(["script", "style"]):
                script.decompose()
            
            text = soup.get_text(separator=' ')
            
            num_chunks = self._save_to_db(text, url, "website", user_id)
            return f"URL Processed: {num_chunks} chunks saved for {user_id}."
        except Exception as e:
            return f"URL Error: {str(e)}"

    def process_video(self, video_url, user_id):
        """YouTube transcript nikal kar specific user ke account mein save karega"""
        try:
            # YouTube ID extract karne ka logic
            video_id_match = re.search(r"(?:v=|\/)([0-9A-Za-z_-]{11}).*", video_url)
            if not video_id_match:
                return "Invalid YouTube URL"
            
            video_id = video_id_match.group(1)
            transcript_list = YouTubeTranscriptApi.get_transcript(video_id)
            full_transcript = " ".join([t['text'] for t in transcript_list])
            
            num_chunks = self._save_to_db(full_transcript, video_url, "video", user_id)
            return f"Video Processed: {num_chunks} chunks saved for {user_id}."
        except Exception as e:
            return f"YouTube Error: {str(e)}"

# Global instance
ingestor = IngestionService()