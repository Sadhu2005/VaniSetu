# In backend/main.py

from fastapi import FastAPI

app = FastAPI(
    title="AnuTranslate API",
    description="API for real-time voice translation and dubbing.",
    version="1.0.0"
)

@app.get("/")
def read_root():
    return {"status": "ok", "message": "VaniSetu API is running!"}