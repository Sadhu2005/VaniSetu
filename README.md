# AI-Based Real-Time Voice Translation & Dubbing for Online Videos
Meaning: In Sanskrit, Vāṇī means "voice" or "speech," and Setu means "bridge." This name translates to "A Bridge of Voices," beautifully capturing our mission to connect languages.


# VaniSetu: AI Video Dubbing Pipeline 🎙️

[![VaniSetu CI/CD](https://github.com/Sadhu2005/VaniSetu/actions/workflows/ci.yml/badge.svg)](https://github.com/Sadhu2005/VaniSetu/actions/workflows/ci.yml)

An end-to-end MLOps project to provide real-time voice translation and dubbing for online videos, making global content accessible in local Indian languages.

---
## ✨ Features

* **Speech-to-Text:** Utilizes OpenAI's **Whisper** for accurate audio transcription.
* **Intelligent Translation:** Employs Google's **Gemini** LLM to translate English into natural, conversational "Hinglish," preserving key technical terms and names.
* **Text-to-Speech:** Converts the Hinglish text back into audio for the final dubbed track.
* **Automated MLOps Pipeline:** A complete CI/CD pipeline using **GitHub Actions** and **Docker** for automated builds, packaging, and deployment.

---
## 🚀 How It Works: The MLOps Pipeline

This project is built on a fully automated CI/CD pipeline. When a developer pushes code to the `develop` branch, the following process is triggered automatically:

1.  **GitHub Actions Trigger:** The push is detected by GitHub, which starts the CI/CD workflow.
2.  **Build Docker Image:** A cloud-based runner builds the FastAPI application into a self-contained Docker image, including all AI models and dependencies.
3.  **Push to Registry:** The newly built Docker image is pushed and stored in Docker Hub, tagging it as the latest version.
4.  **Deployment (Future):** The workflow will be updated to send a webhook to a GPU cloud provider like **RunPod**, telling it to pull the latest image and deploy the new version of the service.

---
## 🛠️ Getting Started: Local Development

To run this project on your local machine, follow these steps.

### Prerequisites

* Git
* Python 3.12+
* Docker Desktop

### Setup Instructions

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/Sadhu2005/VaniSetu.git](https://github.com/Sadhu2005/VaniSetu.git)
    cd VaniSetu
    ```

2.  **Set up the backend environment:**
    ```bash
    cd backend
    python -m venv venv
    # Activate the virtual environment
    # Windows:
    .\venv\Scripts\activate
    # macOS/Linux:
    source venv/bin/activate
    ```

3.  **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Set up API Keys (see below).**

5.  **Run the local server:**
    ```bash
    uvicorn main:app --reload
    ```

---
## 🔑 Environment Variables & API Keys

This project requires API keys to connect to AI services. **Never commit your secret keys to GitHub.**

### For Local Development

1.  Create a file named `.env` inside the `backend` folder.
2.  Add your Google AI Studio API key to this file:

    ```
    # In backend/.env
    GOOGLE_API_KEY="your_google_ai_studio_api_key_here"
    ```

    *The `.gitignore` file is already configured to ignore `.env` files, keeping your keys safe.*

### For Production (RunPod)

When you deploy the application to a cloud service like RunPod, you must set the `GOOGLE_API_KEY` as an **Environment Variable** or **Secret** in the service's settings dashboard.

---
## 📈 Project Status & Roadmap

This section tracks the progress and future plans for the VaniSetu project.

### Phase 1: MLOps Foundation & Prototyping (Completed)
- [x] Setup Git repository and project structure.
- [x] Develop a basic FastAPI backend application.
- [x] Containerize the application with Docker.
- [x] Build a full CI/CD pipeline with GitHub Actions to build and push the image.
- [x] Prototype the complete AI pipeline in Google Colab (Whisper → Gemini → TTS).

### Phase 2: MVP Integration (In Progress)
- [ ] Integrate the full end-to-end AI pipeline into the FastAPI backend.
- [ ] Deploy the AI-powered service to a GPU cloud host (RunPod).
- [ ] Develop the basic Chrome Extension frontend to interact with the API.

### Phase 3: Future Enhancements (Roadmap)
- [ ] Improve TTS voice quality by training a custom, emotional Coqui TTS model.
- [ ] Optimize the pipeline for lower latency to achieve near real-time dubbing.
- [ ] Add support for more source and target languages.
- [ ] Implement user accounts and a subscription model.