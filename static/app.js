import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

const loginView = document.getElementById("login-view");
const appView = document.getElementById("app-view");
const loginForm = document.getElementById("login-form");
const signupButton = document.getElementById("signup-button");
const authStatus = document.getElementById("auth-status");
const userEmail = document.getElementById("user-email");
const logoutButton = document.getElementById("logout-button");
const uploadForm = document.getElementById("upload-form");
const questionForm = document.getElementById("question-form");
const uploadStatus = document.getElementById("upload-status");
const questionStatus = document.getElementById("question-status");
const answerCard = document.getElementById("answer-card");
const answerText = document.getElementById("answer-text");
const sources = document.getElementById("sources");

let auth = null;
let currentUser = null;
let documentId = null;

function setAuthFormDisabled(disabled) {
  loginForm.querySelectorAll("input, button").forEach((item) => {
    item.disabled = disabled;
  });
}

async function initAuth() {
  setAuthFormDisabled(true);
  const response = await fetch("/api/config");
  const config = await response.json();

  if (!config.firebaseConfigured) {
    authStatus.textContent = "Firebase is not configured on this server.";
    return;
  }

  const firebaseApp = initializeApp(config.firebase);
  auth = getAuth(firebaseApp);
  setAuthFormDisabled(false);

  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    documentId = null;
    answerCard.classList.add("hidden");
    uploadStatus.textContent = "";
    questionStatus.textContent = "";

    if (user) {
      userEmail.textContent = user.email || "Signed in";
      loginView.classList.add("hidden");
      appView.classList.remove("hidden");
      return;
    }

    userEmail.textContent = "";
    appView.classList.add("hidden");
    loginView.classList.remove("hidden");
  });
}

async function authHeaders() {
  if (!currentUser) {
    throw new Error("Sign in before using the service.");
  }
  const token = await currentUser.getIdToken();
  return {
    Authorization: `Bearer ${token}`,
  };
}

async function submitAuth(mode) {
  if (!auth) {
    authStatus.textContent = "Firebase Auth is still loading. Refresh the page and try again.";
    return;
  }

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  authStatus.textContent = mode === "signup" ? "Creating account..." : "Signing in...";

  try {
    if (mode === "signup") {
      await createUserWithEmailAndPassword(auth, email, password);
    } else {
      await signInWithEmailAndPassword(auth, email, password);
    }
    authStatus.textContent = "";
  } catch (error) {
    authStatus.textContent = error.message;
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await submitAuth("login");
});

signupButton.addEventListener("click", async () => {
  await submitAuth("signup");
});

logoutButton.addEventListener("click", async () => {
  if (auth) {
    await signOut(auth);
  }
});

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
      headers: await authHeaders(),
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
      headers: await authHeaders(),
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

initAuth().catch((error) => {
  authStatus.textContent = error.message;
});
