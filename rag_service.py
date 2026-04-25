from pathlib import Path
from uuid import uuid4

from document_loader import load_pdf
from embeddings import get_embeddings
from llm_query import ask_llm, get_llm
from rag_pipeline import split_documents
from vector_store import create_vector_store, load_vector_store


class RAGService:
    def __init__(self, base_dir="storage"):
        self.base_dir = Path(base_dir)
        self.uploads_dir = self.base_dir / "uploads"
        self.vectorstores_dir = self.base_dir / "vectorstores"
        self.uploads_dir.mkdir(parents=True, exist_ok=True)
        self.vectorstores_dir.mkdir(parents=True, exist_ok=True)
        self.embeddings = None
        self.llm = None
        self.vectorstores = {}

    def _get_embeddings(self):
        if self.embeddings is None:
            self.embeddings = get_embeddings()
        return self.embeddings

    def _get_llm(self):
        if self.llm is None:
            self.llm = get_llm()
        return self.llm

    def ingest_pdf(self, file_bytes, filename, uid):
        document_id = str(uuid4())
        safe_name = Path(filename).name or f"{document_id}.pdf"
        file_path = self.uploads_dir / f"{document_id}_{safe_name}"

        with file_path.open("wb") as file_handle:
            file_handle.write(file_bytes)

        docs = load_pdf(str(file_path))
        chunks = split_documents(docs)
        persist_directory = self.vectorstores_dir / document_id
        vectorstore = create_vector_store(
            chunks,
            self._get_embeddings(),
            persist_directory=str(persist_directory),
        )

        self.vectorstores[document_id] = {
            "vectorstore": vectorstore,
            "file_path": str(file_path),
            "filename": safe_name,
            "chunks": len(chunks),
            "uid": uid,
            "persist_directory": str(persist_directory),
        }

        return {
            "document_id": document_id,
            "filename": safe_name,
            "chunks": len(chunks),
        }

    def _get_vectorstore(self, document_id):
        if document_id not in self.vectorstores:
            persist_directory = self.vectorstores_dir / document_id
            if not persist_directory.exists():
                raise KeyError("Document not found. Upload the PDF again.")
            self.vectorstores[document_id] = {
                "vectorstore": load_vector_store(
                    self._get_embeddings(),
                    persist_directory=str(persist_directory),
                ),
                "persist_directory": str(persist_directory),
            }
        return self.vectorstores[document_id]["vectorstore"]

    def ask(self, document_id, question, uid, k=3):
        if document_id in self.vectorstores:
            owner_uid = self.vectorstores[document_id].get("uid")
            if owner_uid and owner_uid != uid:
                raise PermissionError("You do not have access to this document.")

        vectorstore = self._get_vectorstore(document_id)
        results = vectorstore.similarity_search(question, k=k)
        context = "\n".join(doc.page_content for doc in results)
        answer = ask_llm(self._get_llm(), context, question)

        return {
            "answer": answer,
            "sources": [doc.page_content[:300] for doc in results],
        }
