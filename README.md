# AI PDF Chatbot

An AI-powered PDF question answering website built with FastAPI, Gemini, Firebase Auth, Firestore, ChromaDB, and LangChain.

## Features

- Login page before users can access the PDF chatbot
- Firebase email/password authentication
- Upload and analyze PDF documents
- Gemini embeddings for document search
- Gemini chat model for document-based answers
- Firestore document metadata per signed-in user
- FastAPI web UI and API for browser usage
- Docker and Render deployment support

## Project Structure

```text
ai-pdf-chatbot/
├── main.py               # FastAPI entrypoint
├── firebase_service.py   # Firebase token verification and Firestore writes
├── rag_service.py        # PDF ingestion and question answering
├── document_loader.py    # Loads PDF files
├── rag_pipeline.py       # Splits documents into chunks
├── embeddings.py         # Gemini embeddings
├── vector_store.py       # Chroma vector database helpers
├── llm_query.py          # Gemini chat interaction
├── static/               # Website assets
├── Dockerfile
├── render.yaml
└── requirements.txt
```

## Firebase Setup

1. Create a Firebase project.
2. Enable Authentication, then enable the Email/Password provider.
3. Create a Firestore database with database ID `(default)`.
   If you created a named database instead, set `FIRESTORE_DATABASE_ID` to that database ID.
4. Create a Firebase Web App and copy its config values into `.env`.
5. Create a Firebase service account key and paste the JSON into `FIREBASE_SERVICE_ACCOUNT_JSON` as one line.

Firestore free quota is enough for testing: 1 GiB stored data, 50,000 reads/day, and 20,000 writes/day. See Firebase quotas: https://firebase.google.com/docs/firestore/quotas

## Gemini Setup

Create a Gemini API key in Google AI Studio and set:

```env
GOOGLE_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
GEMINI_EMBEDDING_MODEL=gemini-embedding-001
FIRESTORE_DATABASE_ID=(default)
```

## Run Locally

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn main:app --reload
```

Open `http://127.0.0.1:8000`.

## Run With Docker

```powershell
docker compose up --build
```

Open `http://127.0.0.1:8000`.

## Deploy Free

Recommended free host: Render Web Service.

Render supports free Python/Docker web services and gives your app a public `onrender.com` URL. Free instances are good for testing or hobby projects, not production. Render docs: https://render.com/docs/free

Steps:

1. Push this repo to GitHub.
2. In Render, create a new Blueprint or Web Service from the repo.
3. Use the included `render.yaml`, or create a Docker web service manually.
4. Add every variable from `.env.example` in Render environment variables.
5. Deploy.

The app reads the `PORT` variable automatically in Docker, so it works with Render's assigned port.

## API Overview

- `GET /` serves the website UI
- `GET /api/config` returns Firebase public web config
- `POST /api/upload` stores and indexes a PDF for the signed-in user
- `POST /api/ask` answers questions for a signed-in user's uploaded document

Each uploaded PDF gets its own local Chroma vector store under `storage/vectorstores`. On free hosting, local disk may be temporary, so use this as a free demo setup. For long-term production storage, move PDFs and vector data to persistent storage.
