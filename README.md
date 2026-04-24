# AI PDF Chatbot

An AI-powered PDF question answering system built around a Retrieval-Augmented Generation (RAG) pipeline. The repository now contains both the original Streamlit app and a website-backed FastAPI service for PDF upload and document Q&A.

## Features

- Upload and analyze PDF documents
- Ask natural language questions about document content
- Semantic search using embeddings
- Context-aware answers using an LLM
- FastAPI web UI and API for browser-based usage
- Docker and Docker Compose support
- Local Ollama-backed inference

## Project Structure

```text
ai-pdf-chatbot/
├── app.py                # Streamlit UI
├── main.py               # FastAPI entrypoint
├── rag_service.py        # FastAPI service helpers
├── document_loader.py    # Loads PDF files
├── rag_pipeline.py       # Splits documents into chunks
├── embeddings.py         # Creates embeddings
├── vector_store.py       # Creates vector database
├── llm_query.py          # LLM interaction
├── static/               # Website assets
├── requirements.txt
└── README.md
```

## RAG Pipeline

```text
PDF Document
      ↓
Text Extraction
      ↓
Document Chunking
      ↓
Text Embeddings
      ↓
Vector Database (ChromaDB)
      ↓
User Question
      ↓
Similarity Search
      ↓
Relevant Context Retrieval
      ↓
LLM (Mistral / Phi3 via Ollama)
      ↓
Final AI Answer
```

## Run Locally

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload
```

Open `http://127.0.0.1:8000`.

If Ollama is running on your machine, pull the model first:

```powershell
ollama pull mistral
```

## Run With Docker

1. Copy `.env.example` to `.env`.
2. Start the stack:

```powershell
docker compose up --build
```

3. In a separate terminal, load the model into the Ollama container:

```powershell
docker exec -it ai-pdf-chatbot-ollama ollama pull mistral
```

Open `http://127.0.0.1:8000`.

## API Overview

- `GET /` serves the website UI
- `POST /api/upload` stores and indexes a PDF
- `POST /api/ask` answers questions for one uploaded document

Each uploaded PDF gets its own vector store under `storage/vectorstores`.

## Notes

- The current LLM backend is `Ollama` with the `mistral` model
- The app reads `OLLAMA_BASE_URL`, `OLLAMA_MODEL`, `OLLAMA_NUM_GPU`, and `LLM_TEMPERATURE` from the environment
- The `.env` Google API key is not used by the current code path
- The old Streamlit app remains in `app.py`

## Tech Stack

- Python
- FastAPI
- Streamlit
- LangChain
- Sentence Transformers
- ChromaDB
- Ollama

## Example Questions

- What is the transformer architecture?
- Who wrote this paper?
- Explain the main idea of the document.
- What does Figure 1 represent?

## Production Direction

- Deploy the FastAPI app as a containerized web service
- Run Ollama as a separate service or replace it with a hosted model API
- Move uploads and document metadata out of local disk for multi-instance deployment
