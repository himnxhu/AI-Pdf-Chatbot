import streamlit as st
from document_loader import load_pdf
from rag_pipeline import split_documents
from embeddings import get_embeddings
from vector_store import create_vector_store
from llm_query import get_llm, ask_llm

st.set_page_config(page_title="AI PDF Chatbot", layout="wide")
st.title("📄 AI PDF Chatbot (RAG System)")

uploaded_file = st.file_uploader("Upload a PDF", type="pdf")

@st.cache_resource
def process_pdf(file_path):
    docs = load_pdf(file_path)
    chunks = split_documents(docs)
    embeddings = get_embeddings()
    vectorstore = create_vector_store(chunks, embeddings)
    return vectorstore

# ✅ Only run after upload
if uploaded_file is not None:

    # Save file
    with open("temp.pdf", "wb") as f:
        f.write(uploaded_file.read())

    st.success("PDF uploaded successfully!")

    with st.spinner("Processing document..."):
        vectorstore = process_pdf("temp.pdf")
        llm = get_llm()

    st.success("Ready! Ask your question 👇")

    question = st.text_input("Ask a question")

    if question:
        results = vectorstore.similarity_search(question, k=3)
        context = "\n".join([doc.page_content for doc in results])

        answer = ask_llm(llm, context, question)

        st.subheader("🤖 Answer:")
        st.write(answer)