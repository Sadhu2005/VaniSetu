# In backend/main.py

import whisper
from fastapi import FastAPI, File, UploadFile
import os

app = FastAPI(
    title="VaniSetu API",
    description="API for real-time voice translation and dubbing.",
    version="1.0.0"
)

# Load the base Whisper model. It's small and efficient for starting.
# The first time this runs on Render, it will download the model.
print("Loading Whisper model...")
model = whisper.load_model("base")
print("Whisper model loaded.")


@app.get("/")
def read_root():
    return {"status": "ok", "message": "VaniSetu API is running!"}


@app.post("/api/v1/transcribe")
async def transcribe_audio(audio: UploadFile = File(...)):
    """
    Accepts an audio file and returns the transcribed text.
    """
    # Save the uploaded file temporarily
    temp_file_path = f"temp_{audio.filename}"
    with open(temp_file_path, "wb") as buffer:
        buffer.write(await audio.read())
    
    # Use Whisper to transcribe the audio file
    result = model.transcribe(temp_file_path)
    
    # Clean up the temporary file
    os.remove(temp_file_path)
    
    # Return the transcribed text
    return {"transcription": result["text"]}