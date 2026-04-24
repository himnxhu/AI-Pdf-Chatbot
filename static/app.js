const uploadForm = document.getElementById("upload-form");
const questionForm = document.getElementById("question-form");
const uploadStatus = document.getElementById("upload-status");
const questionStatus = document.getElementById("question-status");
const answerCard = document.getElementById("answer-card");
const answerText = document.getElementById("answer-text");
const sources = document.getElementById("sources");

let documentId = null;

uploadForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const fileInput = document.getElementById("pdf-file");
  const file = fileInput.files[0];

  if (!file) {
    uploadStatus.textContent = "Select a PDF first.";
    return;
  }

  uploadStatus.textContent = "Uploading and processing...";
  questionStatus.textContent = "";
  answerCard.classList.add("hidden");

  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "Upload failed.");
    }

    documentId = data.document_id;
    uploadStatus.textContent = `Ready: ${data.filename} processed into ${data.chunks} chunks.`;
  } catch (error) {
    uploadStatus.textContent = error.message;
  }
});

questionForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!documentId) {
    questionStatus.textContent = "Upload a PDF before asking a question.";
    return;
  }

  const question = document.getElementById("question").value.trim();
  if (!question) {
    questionStatus.textContent = "Enter a question first.";
    return;
  }

  questionStatus.textContent = "Querying document...";
  answerCard.classList.add("hidden");

  const formData = new FormData();
  formData.append("document_id", documentId);
  formData.append("question", question);

  try {
    const response = await fetch("/api/ask", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "Question failed.");
    }

    answerText.textContent = data.answer;
    sources.innerHTML = "";

    data.sources.forEach((source) => {
      const block = document.createElement("p");
      block.className = "source";
      block.textContent = source;
      sources.appendChild(block);
    });

    answerCard.classList.remove("hidden");
    questionStatus.textContent = "Response generated.";
  } catch (error) {
    questionStatus.textContent = error.message;
  }
});
