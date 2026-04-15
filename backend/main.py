from fastapi import FastAPI, UploadFile, File, Body, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.concurrency import run_in_threadpool
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse

from app.core.agents import anatya_agent
from app.services.ingestion import ingestor
from app.services.llm_service import llm_service 
from app.db.chroma_handler import db_manager 
from fastapi import Query

import shutil
import os
import json
from urllib.parse import unquote 

app = FastAPI(title="Anatya.ai Knowledge Hub")

# --- CORS SETTINGS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ PDF Viewer ke liye data folder mount
if not os.path.exists("./data"): os.makedirs("./data")
app.mount("/data", StaticFiles(directory="data"), name="data")

# ✅ 1. STREAMING ASK ENDPOINT
@app.post("/ask-stream")
async def ask_stream(query: str, user_id: str = "default_user"):
    try:
        response_data = await run_in_threadpool(anatya_agent.handle_query, query, user_id)
        
        def stream_generator():
            # 1. Pehle metadata sources bhej do
            sources = response_data.get('sources', [])
            yield json.dumps({"sources": sources}) + "\n"
            
            # 2. Phir llm_service direct use karo word-by-word streaming ke liye
            for chunk in llm_service.generate_streaming_answer(response_data['answer']):
                yield chunk

        return StreamingResponse(stream_generator(), media_type="text/event-stream")
    except Exception as e:
        print(f"Streaming Error: {str(e)}")
        return {"error": str(e)}

# ✅ 2. NORMAL ASK ENDPOINT
@app.post("/ask")
async def ask_question(query: str, user_id: str = "default_user"):
    try:
        response = await run_in_threadpool(anatya_agent.handle_query, query, user_id)
        return response
    except Exception as e:
        return {"answer": f"Error: {str(e)}", "sources": [], "suggestions": []}

# ✅ 3. PDF UPLOAD
@app.post("/upload-pdf")
async def upload_pdf(user_id: str, file: UploadFile = File(...)):
    file_path = f"./data/{file.filename}"
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    status = await run_in_threadpool(ingestor.process_pdf, file_path, user_id)
    return {"status": status}

# ✅ 4. WEBSITE URL UPLOAD
@app.post("/upload-url")
async def upload_url(user_id: str, url: str = Body(..., embed=True)):
    status = await run_in_threadpool(ingestor.process_url, url, user_id)
    return {"status": status}

# ✅ 5. YOUTUBE VIDEO UPLOAD
@app.post("/upload-video")
async def upload_video(user_id: str, url: str = Body(..., embed=True)):
    status = await run_in_threadpool(ingestor.process_video, url, user_id)
    return {"status": status}

# ✅ 6. GET SOURCES (Only for Specific User)
@app.get("/sources")
async def get_sources(user_id: str = "default_user"):
    try:
        all_data = db_manager.collection.get(where={"user_id": user_id})
        metadatas = all_data.get("metadatas", [])
        unique_sources = list(set([m.get("source") for m in metadatas if m.get("source")]))
        return {"sources": unique_sources}
    except Exception as e:
        return {"sources": [], "error": str(e)}

# ✅ 7. DELETE SOURCE (Fixed & Verified)
from fastapi import Query # Ye import zaroori hai top par

@app.delete("/sources/{source_name:path}") # ':path' add kiya taaki URLs handle ho sakein
async def delete_source(source_name: str, user_id: str = Query(...)):
    try:
        # 1. Properly unquote the name
        decoded_name = unquote(source_name)
        print(f"DEBUG: Attempting to delete: {decoded_name} for user: {user_id}")

        # 2. Delete from ChromaDB
        db_manager.collection.delete(
            where={
                "$and": [
                    {"source": {"$eq": decoded_name}},
                    {"user_id": {"$eq": user_id}}
                ]
            }
        )
        
        # 3. Disk cleanup (Optional)
        file_path = f"./data/{decoded_name}"
        if os.path.exists(file_path):
            os.remove(file_path)
            
        return {"status": "success", "message": f"Deleted {decoded_name}"}
    except Exception as e:
        print(f"DELETE ERROR: {str(e)}")
        return {"status": "error", "message": str(e)}
# ✅ HEALTH CHECK
@app.get("/")
def home():
    return {"message": "Anatya.ai is LIVE!"}