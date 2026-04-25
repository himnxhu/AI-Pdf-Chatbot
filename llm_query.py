import os

from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI

from network_config import ignore_dead_local_proxy


load_dotenv()
ignore_dead_local_proxy()

def get_llm():

    llm = ChatGoogleGenerativeAI(
        model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
        google_api_key=os.getenv("GOOGLE_API_KEY"),
        temperature=float(os.getenv("LLM_TEMPERATURE", "0.2")),
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
