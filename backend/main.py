# In backend/main.py

import os
import whisper
import google.generativeai as genai
from gtts import gTTS
from fastapi import FastAPI, File, UploadFile
from fastapi.responses import FileResponse

# --- App Initialization ---
app = FastAPI(
    title="VaniSetu API",
    description="Full AI Dubbing Pipeline API.",
    version="2.0.0"
)

# --- AI Model & Client Initialization ---

# 1. Load Whisper Model (for Transcription)
print("Loading Whisper 'base' model...")
whisper_model = whisper.load_model("base")
print("Whisper model loaded successfully.")

# 2. Configure Gemini Model (for Translation)
print("Configuring Gemini model...")
try:
    gemini_api_key = os.getenv("GOOGLE_API_KEY")
    genai.configure(api_key=gemini_api_key)
    gemini_model = genai.GenerativeModel('gemini-1.5-flash')
    print("Gemini model configured successfully.")
except Exception as e:
    print(f"Error configuring Gemini: {e}")
    gemini_model = None

# --- API Endpoints ---

@app.get("/")
def read_root():
    """A simple endpoint to confirm the API is running."""
    return {"status": "ok", "message": "VaniSetu API is running!"}


@app.post("/api/v1/dub-audio")
async def dub_audio_pipeline(audio: UploadFile = File(...)):
    """
    Accepts an English audio file and returns a dubbed Hinglish audio file.
    """
    # === Step 1: Transcription (Speech-to-Text) ===
    temp_audio_path = f"temp_{audio.filename}"
    with open(temp_audio_path, "wb") as buffer:
        buffer.write(await audio.read())
    
    transcription_result = whisper_model.transcribe(temp_audio_path, fp16=False)
    english_text = transcription_result["text"]
    
    # === Step 2: Translation (English-to-Hinglish) ===
    if not gemini_model:
        return {"error": "Gemini model not configured. Check API Key."}

    prompt = f"""
    Translate the following English text into conversational Hinglish for a video dubbing project.
    It is very important that you DO NOT translate proper nouns (like 'VaniSetu', 'Whisper')
    or common technical words (like 'project', 'model', 'audio').
    Keep them in their original English form.

    English Text: "{english_text}"
    Hinglish Translation:
    """
    response = gemini_model.generate_content(prompt)
    hinglish_text = response.text.strip()
    
    # === Step 3: Synthesis (Text-to-Speech) ===
    output_audio_path = f"dubbed_{audio.filename}.mp3"
    tts = gTTS(text=hinglish_text, lang='hi', slow=False)
    tts.save(output_audio_path)
    
    # Clean up the temporary input file
    os.remove(temp_audio_path)
    
    # Return the final dubbed audio file
    return FileResponse(path=output_audio_path, media_type="audio/mpeg", filename=output_audio_path)