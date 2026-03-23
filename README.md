📄 AI PDF Chatbot (RAG Based)

An AI-powered PDF Question Answering System that allows users to upload a PDF document and ask questions about its content.
The system retrieves relevant information from the document and generates accurate answers using a Retrieval-Augmented Generation (RAG) pipeline.

This project demonstrates practical use of LLMs, Vector Databases, and Embeddings to build intelligent document assistants.

🚀 Features
📄 Upload and analyze PDF documents
🤖 Ask natural language questions about the document
🔍 Semantic search using embeddings
🧠 Context-aware answers using LLM
⚡ Fast document retrieval with vector database
🖥 Interactive UI built with Streamlit
💻 Runs locally using Ollama models
🧠 How It Works (RAG Pipeline)

The system follows a Retrieval-Augmented Generation architecture.

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
🏗 Architecture
User Interface (Streamlit)
          │
          ▼
    Question Input
          │
          ▼
   Vector Similarity Search
          │
          ▼
 Retrieve Relevant Chunks
          │
          ▼
        LLM
          │
          ▼
     Generated Answer
🛠 Tech Stack
Programming
Python
AI / ML
LangChain
Sentence Transformers
RAG (Retrieval-Augmented Generation)
LLM
Ollama
Mistral / Phi3
Vector Database
ChromaDB
UI
Streamlit
Other Tools
PyPDFLoader
HuggingFace Embeddings
📂 Project Structure
ai-pdf-chatbot
│
├── app.py                # Streamlit UI
├── test_rag.py           # CLI testing script
│
├── document_loader.py    # Loads PDF files
├── rag_pipeline.py       # Splits documents into chunks
├── embeddings.py         # Creates embeddings
├── vector_store.py       # Creates vector database
├── llm_query.py          # LLM interaction
│
├── data/
│   └── sample.pdf
│
├── requirements.txt
└── README.md
⚙ Installation
1️⃣ Clone Repository
git clone https://github.com/yourusername/ai-pdf-chatbot.git
cd ai-pdf-chatbot
2️⃣ Create Virtual Environment
python -m venv venv

Activate environment

Windows

venv\Scripts\activate

Mac/Linux

source venv/bin/activate
3️⃣ Install Dependencies
pip install -r requirements.txt
4️⃣ Install Ollama

Download and install:

https://ollama.com

5️⃣ Pull LLM Model

Example:

ollama run mistral

or lightweight model

ollama run phi3
▶ Run The Application
Start Streamlit UI
streamlit run app.py

Open browser:

http://localhost:8501

Upload a PDF and start asking questions.

💬 Example Questions
What is the transformer architecture?
Who wrote this paper?
Explain the main idea of the document.
What does Figure 1 represent?
📊 Challenges Faced
Memory limitations when running local LLMs
GPU allocation issues with Ollama
Optimizing chunk size for better retrieval
Preventing hallucinations using strict context prompts
🔮 Future Improvements
Multi-PDF support
Chat history memory
Faster vector databases (FAISS)
Cloud deployment (AWS / GCP)
Voice interaction
🌍 Real World Applications
Research paper assistant
Legal document analysis
Enterprise knowledge base
Customer support automation
Academic document search
📸 Demo

(Add screenshots or GIF of Streamlit UI here)

Example:

/screenshots/ui.png
👨‍💻 Author

Himanshu Upadhyay

B.Tech Computer Science (Data Science)

Interested in:

Artificial Intelligence
Data Science
Machine Learning
AI Applications
⭐ If you like this project

Give the repository a star ⭐
_____________________________________________________________________________________________________________________________

RAG | LangChain | LLM | Ollama | Vector Database | Streamlit
