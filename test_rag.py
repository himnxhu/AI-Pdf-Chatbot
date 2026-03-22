from document_loader import load_pdf
from rag_pipeline import split_documents
from embeddings import get_embeddings
from vector_store import create_vector_store
from llm_query import get_llm, ask_llm

print("Loading PDF...")
docs = load_pdf("data/sample.pdf")

print("Splitting text...")
chunks = split_documents(docs)

print("Creating embeddings...")
embeddings = get_embeddings()

print("Creating vector database...")
vectorstore = create_vector_store(chunks, embeddings)

print("Loading LLM...")
llm = get_llm()

while True:

    question = input("\nAsk a question about the document: ")

    if question.lower() == "exit":
        break

    # Retrieve relevant chunks
    results = vectorstore.similarity_search(question, k=5)

    unique_texts = list(set([doc.page_content for doc in results]))

    context = "\n".join(unique_texts)

    # DEBUG: show retrieved context
    print("\nRetrieved Context:\n")
    print(context[:800])

    answer = ask_llm(llm, context, question)

    print("\nAI Answer:\n")
    print(answer)