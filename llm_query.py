import os

from dotenv import load_dotenv
from langchain_ollama import ChatOllama


load_dotenv()

def get_llm():

    llm = ChatOllama(
        model=os.getenv("OLLAMA_MODEL", "mistral"),
        temperature=float(os.getenv("LLM_TEMPERATURE", "0.2")),
        num_gpu=int(os.getenv("OLLAMA_NUM_GPU", "0")),
        base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    )

    return llm


def ask_llm(llm, context, question):

    context = context[:3000]

    prompt = f"""
You are a strict document-based assistant.

Answer the question ONLY using the provided context.

Rules:
- Do NOT use any outside knowledge.
- If the answer is not in the context, say exactly:
  "The answer is not available in the document."
- Do NOT add extra information.

Context:
{context}

Question:
{question}

Answer:
"""

    response = llm.invoke(prompt)

    return response.content
