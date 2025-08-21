# In backend/main.py

import whisper
from fastapi import FastAPI, File, UploadFile
import os

# --- App Initialization ---
app = FastAPI(
    title="VaniSetu API",
    description="API for real-time voice translation and dubbing.",
    version="1.0.0"
)

# --- AI Model Loading ---
# This is a crucial optimization: The model is loaded once when the application
# starts, not every time a request is made.
print("Loading Whisper 'base' model...")
model = whisper.load_model("base")
print("Whisper model loaded successfully.")


# --- API Endpoints ---
@app.get("/")
def read_root():
    """A simple endpoint to confirm the API is running."""
    return {"status": "ok", "message": "VaniSetu API is running!"}


@app.post("/api/v1/transcribe")
async def transcribe_audio(audio: UploadFile = File(...)):
    """
    Accepts an audio file and returns the transcribed text.
    """
    # The Whisper library works with file paths, so we save the uploaded file temporarily.
    temp_file_path = f"temp_{audio.filename}"
    with open(temp_file_path, "wb") as buffer:
        buffer.write(await audio.read())
    
    # Use the pre-loaded Whisper model to transcribe the audio.
    result = model.transcribe(temp_file_path, fp16=False) # fp16=False for CPU compatibility
    
    # Clean up by deleting the temporary file.
    os.remove(temp_file_path)
    
    # Return the final transcription.
    return {"transcription": result["text"]}