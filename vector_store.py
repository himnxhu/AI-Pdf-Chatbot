from langchain_community.vectorstores import Chroma

def create_vector_store(chunks, embeddings, persist_directory="db"):

    vectorstore = Chroma.from_documents(
        documents=chunks,
        embedding=embeddings,
        persist_directory=persist_directory
    )

    return vectorstore


def load_vector_store(embeddings, persist_directory="db"):

    return Chroma(
        persist_directory=persist_directory,
        embedding_function=embeddings,
    )
