from document_loader import load_pdf

print("Loading PDF...")

docs = load_pdf("data/sample.pdf")

print("Total pages:", len(docs))

print("\nFirst page preview:\n")

print(docs[0].page_content[:500])