from document_loader import load_pdf
from rag_pipeline import split_documents
from embeddings import get_embeddings
from vector_store import create_vector_store

print("Loading PDF...")

docs = load_pdf("data/sample.pdf")

print("Splitting text...")

chunks = split_documents(docs)

print("Loading embeddings...")

embeddings = get_embeddings()

print("Creating vector database...")

vectorstore = create_vector_store(chunks, embeddings)

print("Searching document...")

results = vectorstore.similarity_search("What is transformer architecture?")

print("\nTop result:\n")

print(results[0].page_content[:500])