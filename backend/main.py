from fastapi import FastAPI, File, UploadFile, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
import whisper
import torch
import torchaudio
from pyannote.audio import Pipeline
from pyannote.core import Segment
import google.generativeai as genai
from gtts import gTTS
import os
import tempfile
import shutil
from demucs.separate import main as separate_audio
import numpy as np
from sklearn.ensemble import RandomForestClassifier
import joblib

app = FastAPI(title="ANU Voice Dub AI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize models (would be loaded once at startup)
whisper_model = None
diarization_pipeline = None
voice_cloning_model = None
speech_classifier = None

@app.on_event("startup")
async def startup_event():
    """Load all AI models on startup"""
    global whisper_model, diarization_pipeline, speech_classifier
    
    print("Loading AI models...")
    
    # Load Whisper model for transcription
    whisper_model = whisper.load_model("base")
    
    # Load speaker diarization model
    diarization_pipeline = Pipeline.from_pretrained(
        "pyannote/speaker-diarization-3.1",
        use_auth_token="YOUR_HUGGINGFACE_TOKEN"  # Replace with your token
    )
    
    # Load speech/singing classifier (example - would need training)
    speech_classifier = joblib.load("speech_classifier.pkl") if os.path.exists("speech_classifier.pkl") else None
    
    print("All models loaded successfully!")

@app.post("/api/dub-audio")
async def dub_audio(
    background_tasks: BackgroundTasks,
    audio_file: UploadFile = File(...),
    target_language: str = "hi"  # Hindi by default
):
    """Main endpoint for dubbing audio with advanced features"""
    
    # Create temporary files
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_audio:
        shutil.copyfileobj(audio_file.file, temp_audio)
        temp_audio_path = temp_audio.name
    
    try:
        # Step 1: Separate vocals from background
        vocals_path, background_path = separate_vocals(temp_audio_path)
        
        # Step 2: Perform speaker diarization
        speaker_segments = diarize_speakers(vocals_path)
        
        # Step 3: Classify speech vs singing
        speech_segments = classify_vocal_segments(vocals_path, speaker_segments)
        
        # Step 4: Transcribe speech segments
        transcriptions = transcribe_audio(vocals_path, speech_segments)
        
        # Step 5: Translate text
        translations = translate_text(transcriptions, target_language)
        
        # Step 6: Generate dubbed audio with voice cloning
        dubbed_vocals_path = generate_dubbed_audio(translations, speaker_segments)
        
        # Step 7: Mix dubbed vocals with original background
        final_audio_path = mix_audio(dubbed_vocals_path, background_path)
        
        # Cleanup task
        background_tasks.add_task(cleanup_files, [
            temp_audio_path, vocals_path, background_path, dubbed_vocals_path
        ])
        
        return FileResponse(
            final_audio_path, 
            media_type="audio/mpeg", 
            filename="dubbed_audio.mp3"
        )
        
    except Exception as e:
        return {"error": str(e)}

def separate_vocals(audio_path):
    """Separate vocals from background using Demucs"""
    output_dir = tempfile.mkdtemp()
    
    # Run Demucs separation
    separate_audio(["--two-stems", "vocals", "-n", "htdemucs", "-o", output_dir, audio_path])
    
    # Paths to separated audio
    base_name = os.path.splitext(os.path.basename(audio_path))[0]
    vocals_path = os.path.join(output_dir, "htdemucs", base_name, "vocals.wav")
    background_path = os.path.join(output_dir, "htdemucs", base_name, "no_vocals.wav")
    
    return vocals_path, background_path

def diarize_speakers(audio_path):
    """Identify different speakers in the audio"""
    diarization = diarization_pipeline(audio_path)
    
    speaker_segments = []
    for turn, _, speaker in diarization.itertracks(yield_label=True):
        speaker_segments.append({
            "start": turn.start,
            "end": turn.end,
            "speaker": speaker,
            "type": "unknown"  # Will be classified later
        })
    
    return speaker_segments

def classify_vocal_segments(audio_path, segments):
    """Classify segments as speech or singing"""
    # Load audio
    waveform, sample_rate = torchaudio.load(audio_path)
    
    for segment in segments:
        # Extract segment
        start_sample = int(segment["start"] * sample_rate)
        end_sample = int(segment["end"] * sample_rate)
        segment_audio = waveform[:, start_sample:end_sample]
        
        # Extract features (simplified example)
        # In practice, you would extract MFCCs or other audio features
        features = extract_audio_features(segment_audio.numpy(), sample_rate)
        
        # Predict
        if speech_classifier:
            prediction = speech_classifier.predict([features])[0]
            segment["type"] = "speech" if prediction == 0 else "singing"
        else:
            # Fallback heuristic based on duration and energy
            segment["type"] = classify_heuristic(segment_audio, sample_rate)
    
    return [s for s in segments if s["type"] == "speech"]

def transcribe_audio(audio_path, segments):
    """Transcribe speech segments using Whisper"""
    transcriptions = []
    
    for segment in segments:
        # Load audio segment
        result = whisper_model.transcribe(
            audio_path, 
            word_timestamps=False,
            initial_prompt="Transcribe clearly.",
            fp16=False  # Use float32 for compatibility
        )
        
        # Find text within the segment timeframe
        segment_text = ""
        for seg in result["segments"]:
            if seg["start"] >= segment["start"] and seg["end"] <= segment["end"]:
                segment_text += seg["text"] + " "
        
        transcriptions.append({
            "start": segment["start"],
            "end": segment["end"],
            "speaker": segment["speaker"],
            "text": segment_text.strip()
        })
    
    return transcriptions

def translate_text(transcriptions, target_language):
    """Translate transcribed text using Gemini"""
    # Configure Gemini (you would set up your API key)
    genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
    model = genai.GenerativeModel('gemini-pro')
    
    translations = []
    
    for item in transcriptions:
        prompt = f"Translate this English dialogue to {target_language} while preserving the conversational tone: {item['text']}"
        response = model.generate_content(prompt)
        
        translations.append({
            **item,
            "translated_text": response.text
        })
    
    return translations

def generate_dubbed_audio(translations, speaker_segments):
    """Generate dubbed audio using voice cloning"""
    # This would integrate with your voice cloning system
    # For now, using gTTS as a placeholder
    
    output_dir = tempfile.mkdtemp()
    output_path = os.path.join(output_dir, "dubbed_vocals.wav")
    
    # Group by speaker and generate audio
    all_audio_segments = []
    
    for speaker in set(seg["speaker"] for seg in speaker_segments):
        # Get all translations for this speaker
        speaker_texts = [t for t in translations if t["speaker"] == speaker]
        
        # Generate voice for this speaker (would use voice cloning in production)
        text_to_speak = " ".join([t["translated_text"] for t in speaker_texts])
        
        # Generate TTS for this speaker
        tts = gTTS(text=text_to_speak, lang='hi', slow=False)
        speaker_audio_path = os.path.join(output_dir, f"speaker_{speaker}.mp3")
        tts.save(speaker_audio_path)
        
        # Convert to tensor and split into segments
        waveform, sample_rate = torchaudio.load(speaker_audio_path)
        total_duration = waveform.shape[1] / sample_rate
        
        # Distribute audio across segments
        for segment in speaker_texts:
            segment_duration = segment["end"] - segment["start"]
            # Calculate proportional part of the generated audio
            # This is simplified - actual implementation would need precise alignment
            start_sample = int((segment["start"] / total_duration) * waveform.shape[1])
            end_sample = int((segment["end"] / total_duration) * waveform.shape[1])
            
            segment_audio = waveform[:, start_sample:end_sample]
            all_audio_segments.append({
                "start": segment["start"],
                "audio": segment_audio
            })
    
    # Sort by start time and combine
    all_audio_segments.sort(key=lambda x: x["start"])
    
    # Create final audio (simplified - would need proper mixing)
    final_audio = torch.cat([seg["audio"] for seg in all_audio_segments], dim=1)
    torchaudio.save(output_path, final_audio, sample_rate)
    
    return output_path

def mix_audio(vocals_path, background_path):
    """Mix dubbed vocals with original background"""
    vocals, sr_v = torchaudio.load(vocals_path)
    background, sr_b = torchaudio.load(background_path)
    
    # Ensure same sample rate
    if sr_v != sr_b:
        background = torchaudio.functional.resample(background, sr_b, sr_v)
    
    # Ensure same length (pad if necessary)
    max_length = max(vocals.shape[1], background.shape[1])
    
    if vocals.shape[1] < max_length:
        padding = torch.zeros(vocals.shape[0], max_length - vocals.shape[1])
        vocals = torch.cat([vocals, padding], dim=1)
    
    if background.shape[1] < max_length:
        padding = torch.zeros(background.shape[0], max_length - background.shape[1])
        background = torch.cat([background, padding], dim=1)
    
    # Mix audio (you might want to adjust levels)
    mixed_audio = vocals + background * 0.8  # Reduce background volume slightly
    
    # Save result
    output_path = os.path.join(tempfile.mkdtemp(), "final_mix.wav")
    torchaudio.save(output_path, mixed_audio, sr_v)
    
    return output_path

def cleanup_files(file_paths):
    """Clean up temporary files"""
    for path in file_paths:
        if os.path.exists(path):
            if os.path.isdir(path):
                shutil.rmtree(path)
            else:
                os.remove(path)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)