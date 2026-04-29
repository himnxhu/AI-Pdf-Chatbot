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
const questionInput = document.getElementById("question");
const uploadStatus = document.getElementById("upload-status");
const questionStatus = document.getElementById("question-status");
const uploadActivity = document.getElementById("upload-activity");
const questionActivity = document.getElementById("question-activity");
const answerCard = document.getElementById("answer-card");
const answerText = document.getElementById("answer-text");
const sources = document.getElementById("sources");
const historyList = document.getElementById("history-list");
const historyStatus = document.getElementById("history-status");
const chatHistory = document.getElementById("chat-history");
const newChatButton = document.getElementById("new-chat-button");
const historySearch = document.getElementById("history-search");
const recentToggle = document.getElementById("recent-toggle");
const recentContent = document.getElementById("recent-content");
const searchToggle = document.getElementById("search-toggle");
const searchContent = document.getElementById("search-content");
const refreshPanels = [
  uploadForm.closest(".panel"),
  questionForm.closest(".panel"),
];

let auth = null;
let currentUser = null;
let documentId = null;
let activeHistory = [];
let historySearchTerm = "";
let activeRequestCount = 0;
const busyMessage = "A PDF upload or answer generation is still running. Leaving now may lose the result.";

function setPageBusy(active) {
  activeRequestCount += active ? 1 : -1;
  activeRequestCount = Math.max(activeRequestCount, 0);

  const isBusy = activeRequestCount > 0;
  newChatButton.disabled = isBusy;
  recentToggle.disabled = isBusy;
  searchToggle.disabled = isBusy;
  logoutButton.disabled = isBusy;
}

function isPageBusy() {
  return activeRequestCount > 0;
}

function setRecentOpen(open) {
  recentToggle.setAttribute("aria-expanded", String(open));
  recentContent.classList.toggle("hidden", !open);
}

function setSearchOpen(open) {
  searchToggle.setAttribute("aria-expanded", String(open));
  searchContent.classList.toggle("hidden", !open);
  if (open) {
    historySearch.focus();
  }
}

function setAuthFormDisabled(disabled) {
  loginForm.querySelectorAll("input, button").forEach((item) => {
    item.disabled = disabled;
  });
}

function setFormDisabled(form, disabled) {
  form.querySelectorAll("input, textarea, button").forEach((item) => {
    item.disabled = disabled;
  });
}

function setActivity(activity, form, active) {
  const panel = form.closest(".panel");
  activity.classList.toggle("hidden", !active);
  activity.setAttribute("aria-hidden", String(!active));
  panel.classList.toggle("is-busy", active);
  setFormDisabled(form, active);
}

function formatSessionDate(value) {
  if (!value) {
    return "No activity yet";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Recent";
  }

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function renderChatTurn(turn, prepend = false) {
  const item = document.createElement("article");
  item.className = "chat-turn";

  const question = document.createElement("p");
  question.className = "chat-message";
  const questionLabel = document.createElement("strong");
  questionLabel.textContent = "You";
  question.append(questionLabel, document.createTextNode(turn.question));

  const answer = document.createElement("p");
  answer.className = "chat-message";
  const answerLabel = document.createElement("strong");
  answerLabel.textContent = "Answer";
  answer.append(answerLabel, document.createTextNode(turn.answer));

  item.append(question, answer);
  if (prepend) {
    chatHistory.prepend(item);
    return;
  }

  chatHistory.appendChild(item);
}

function renderChatHistory(turns) {
  chatHistory.innerHTML = "";
  turns.forEach((turn) => renderChatTurn(turn));
}

function resetChatWorkspace(message = "") {
  documentId = null;
  renderChatHistory([]);
  answerCard.classList.add("hidden");
  answerText.textContent = "";
  sources.innerHTML = "";
  uploadStatus.textContent = message;
  questionStatus.textContent = "";
  uploadForm.reset();
  questionForm.reset();
  renderHistory(activeHistory);
}

function animateWorkspaceRefresh() {
  refreshPanels.forEach((panel, index) => {
    if (!panel) {
      return;
    }

    panel.classList.remove("panel-refresh");
    void panel.offsetWidth;
    panel.style.animationDelay = `${index * 80}ms`;
    panel.classList.add("panel-refresh");
    panel.addEventListener("animationend", () => {
      panel.classList.remove("panel-refresh");
      panel.style.animationDelay = "";
    }, { once: true });
  });
}

function renderHistory(sessions) {
  activeHistory = sessions;
  historyList.innerHTML = "";

  const visibleSessions = sessions.filter((session) => {
    const query = historySearchTerm.trim().toLowerCase();
    if (!query) {
      return true;
    }

    return [
      session.filename,
      session.latest_question,
      session.document_id,
    ].some((value) => String(value || "").toLowerCase().includes(query));
  });

  if (!sessions.length) {
    historyStatus.textContent = "No recent sessions yet.";
    return;
  }

  if (!visibleSessions.length) {
    historyStatus.textContent = "No matching chats.";
    return;
  }

  historyStatus.textContent = "";
  visibleSessions.forEach((session) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "history-item";
    button.dataset.documentId = session.document_id;
    button.classList.toggle("active", session.document_id === documentId);

    const title = document.createElement("span");
    title.className = "history-title";
    title.textContent = session.filename || "Untitled PDF";

    const meta = document.createElement("span");
    meta.className = "history-meta";
    const questions = session.question_count || 0;
    meta.textContent = `${questions} ${questions === 1 ? "question" : "questions"} - ${formatSessionDate(session.last_activity_at || session.created_at)}`;

    const preview = document.createElement("span");
    preview.className = "history-preview";
    preview.textContent = session.latest_question || "No questions asked yet.";

    button.append(title, meta, preview);
    button.addEventListener("click", () => loadHistorySession(session.document_id));
    historyList.appendChild(button);
  });
}

async function loadHistory() {
  if (!currentUser) {
    renderHistory([]);
    return;
  }

  try {
    const response = await fetch("/api/history", {
      headers: await authHeaders(),
    });
    const data = await readApiResponse(response, "Could not load history.");
    renderHistory(data.sessions || []);
  } catch (error) {
    historyStatus.textContent = error.message;
  }
}

async function loadHistorySession(nextDocumentId) {
  historyStatus.textContent = "Loading session...";

  try {
    const response = await fetch(`/api/history/${encodeURIComponent(nextDocumentId)}`, {
      headers: await authHeaders(),
    });
    const data = await readApiResponse(response, "Could not load session.");

    documentId = data.document.document_id;
    const savedTurns = data.questions || [];
    renderHistory(activeHistory);
    renderChatHistory(savedTurns);
    answerCard.classList.add("hidden");
    uploadStatus.textContent = `Loaded: ${data.document.filename}`;
    questionStatus.textContent = savedTurns.length
      ? "Previous questions restored. Ask another question to continue."
      : "Session loaded. Ask a question to continue.";
    historyStatus.textContent = "";
  } catch (error) {
    historyStatus.textContent = error.message;
  }
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
    renderChatHistory([]);
    answerCard.classList.add("hidden");
    uploadStatus.textContent = "";
    questionStatus.textContent = "";
    activeRequestCount = 0;
    setPageBusy(false);
    setActivity(uploadActivity, uploadForm, false);
    setActivity(questionActivity, questionForm, false);

    if (user) {
      userEmail.textContent = user.email || "Signed in";
      loginView.classList.add("hidden");
      appView.classList.remove("hidden");
      loadHistory();
      return;
    }

    userEmail.textContent = "";
    renderHistory([]);
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

async function readApiResponse(response, fallbackMessage) {
  const text = await response.text();
  let data = {};

  if (text) {
    try {
      data = JSON.parse(text);
    } catch (error) {
      if (response.ok) {
        throw new Error("Server returned an invalid response.");
      }
      throw new Error(text || fallbackMessage);
    }
  }

  if (!response.ok) {
    throw new Error(data.detail || fallbackMessage);
  }

  return data;
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

questionInput.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" || event.shiftKey || event.isComposing) {
    return;
  }

  event.preventDefault();
  questionForm.requestSubmit();
});

newChatButton.addEventListener("click", () => {
  resetChatWorkspace("Start a new chat by uploading a PDF.");
  animateWorkspaceRefresh();
});

recentToggle.addEventListener("click", () => {
  const isOpen = recentToggle.getAttribute("aria-expanded") === "true";
  setRecentOpen(!isOpen);
});

searchToggle.addEventListener("click", () => {
  const isOpen = searchToggle.getAttribute("aria-expanded") === "true";
  setSearchOpen(!isOpen);
});

historySearch.addEventListener("input", (event) => {
  historySearchTerm = event.target.value;
  renderHistory(activeHistory);
});

window.addEventListener("beforeunload", (event) => {
  if (!isPageBusy()) {
    return;
  }

  event.preventDefault();
  event.returnValue = busyMessage;
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
  renderChatHistory([]);
  answerCard.classList.add("hidden");
  setPageBusy(true);
  setActivity(uploadActivity, uploadForm, true);

  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch("/api/upload", {
      method: "POST",
      headers: await authHeaders(),
      body: formData,
    });

    const data = await readApiResponse(response, "Upload failed.");

    documentId = data.document_id;
    uploadStatus.textContent = `Ready: ${data.filename} processed into ${data.chunks} chunks.`;
    await loadHistory();
  } catch (error) {
    uploadStatus.textContent = error.message;
  } finally {
    setActivity(uploadActivity, uploadForm, false);
    setPageBusy(false);
  }
});

questionForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!documentId) {
    questionStatus.textContent = "Upload a PDF before asking a question.";
    return;
  }

  const question = questionInput.value.trim();
  if (!question) {
    questionStatus.textContent = "Enter a question first.";
    return;
  }

  questionStatus.textContent = "Querying document...";
  answerCard.classList.add("hidden");
  setPageBusy(true);
  setActivity(questionActivity, questionForm, true);

  const formData = new FormData();
  formData.append("document_id", documentId);
  formData.append("question", question);

  try {
    const response = await fetch("/api/ask", {
      method: "POST",
      headers: await authHeaders(),
      body: formData,
    });

    const data = await readApiResponse(response, "Question failed.");

    answerText.textContent = data.answer;
    sources.innerHTML = "";

    data.sources.forEach((source) => {
      const block = document.createElement("p");
      block.className = "source";
      block.textContent = source;
      sources.appendChild(block);
    });

    renderChatTurn({
      question,
      answer: data.answer,
    }, true);
    answerCard.classList.remove("hidden");
    questionStatus.textContent = "Response generated.";
    questionInput.value = "";
    await loadHistory();
  } catch (error) {
    questionStatus.textContent = error.message;
  } finally {
    setActivity(questionActivity, questionForm, false);
    setPageBusy(false);
  }
});

initAuth().catch((error) => {
  authStatus.textContent = error.message;
});
