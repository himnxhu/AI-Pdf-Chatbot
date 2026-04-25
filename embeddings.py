import os

from dotenv import load_dotenv
from langchain_google_genai import GoogleGenerativeAIEmbeddings

from network_config import ignore_dead_local_proxy


load_dotenv()
ignore_dead_local_proxy()

def get_embeddings():

    embeddings = GoogleGenerativeAIEmbeddings(
        model=os.getenv("GEMINI_EMBEDDING_MODEL", "gemini-embedding-001"),
        google_api_key=os.getenv("GOOGLE_API_KEY"),
    )

    return embeddings
