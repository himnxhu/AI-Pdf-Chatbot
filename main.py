from pathlib import Path
import os

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from firebase_service import FirebaseService
from rag_service import RAGService


BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"

app = FastAPI(title="AI PDF Chatbot API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
rag_service = RAGService(base_dir=BASE_DIR / "storage")
firebase_service = FirebaseService()


def firebase_web_config():
    return {
        "apiKey": os.getenv("FIREBASE_API_KEY", ""),
        "authDomain": os.getenv("FIREBASE_AUTH_DOMAIN", ""),
        "projectId": os.getenv("FIREBASE_PROJECT_ID", ""),
        "storageBucket": os.getenv("FIREBASE_STORAGE_BUCKET", ""),
        "messagingSenderId": os.getenv("FIREBASE_MESSAGING_SENDER_ID", ""),
        "appId": os.getenv("FIREBASE_APP_ID", ""),
    }


def current_user(authorization: str = Header(default="")):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Sign in before using the service.")

    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(status_code=401, detail="Missing Firebase token.")

    try:
        user = firebase_service.verify_token(token)
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired login.") from exc

    return {
        "uid": user["uid"],
        "email": user.get("email"),
    }


@app.get("/")
async def index():
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/health")
async def health_check():
    return {"status": "ok"}


@app.get("/api/config")
async def config():
    firebase_config = firebase_web_config()
    configured = all(
        firebase_config[key]
        for key in ("apiKey", "authDomain", "projectId", "appId")
    )
    return {
        "firebase": firebase_config,
        "firebaseConfigured": configured,
    }


@app.post("/api/upload")
async def upload_pdf(file: UploadFile = File(...), user=Depends(current_user)):
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        document = rag_service.ingest_pdf(
            file_bytes,
            file.filename or "document.pdf",
            uid=user["uid"],
        )
        expired_document_ids = firebase_service.save_document(user["uid"], document)
        for expired_document_id in expired_document_ids:
            rag_service.delete_document(expired_document_id, user["uid"])
        return document
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/api/ask")
async def ask_question(
    document_id: str = Form(...),
    question: str = Form(...),
    user=Depends(current_user),
):
    if not question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    if firebase_service.firestore_enabled:
        document = firebase_service.get_document(user["uid"], document_id)
        if firebase_service.firestore_enabled and not document:
            raise HTTPException(status_code=404, detail="Document not found. Upload the PDF again.")

    try:
        result = rag_service.ask(
            document_id=document_id,
            question=question.strip(),
            uid=user["uid"],
        )
        firebase_service.save_question(
            user["uid"],
            document_id,
            question.strip(),
            result["answer"],
            result["sources"],
        )
        return result
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/api/history")
async def list_history(user=Depends(current_user)):
    return {"sessions": firebase_service.list_history(user["uid"])}


@app.get("/api/history/{document_id}")
async def get_history_session(document_id: str, user=Depends(current_user)):
    session = firebase_service.get_history_session(user["uid"], document_id)
    if not session:
        raise HTTPException(status_code=404, detail="History session not found.")
    return session
