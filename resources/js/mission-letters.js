import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "firebase/auth";
import {
  addDoc,
  collection,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { fetchOrganizationDisplayName } from "./org-verification.js";
import { readUsDateInputValue } from "./us-date-input.js";

const LETTER_DRAFT_KEY = "kalinga-mission-letter-draft";
let currentUser = null;
let composeWired = false;

function readFormValues() {
  return {
    missionName: document.getElementById("name")?.value?.trim() || "",
    description: document.getElementById("description")?.value?.trim() || "",
    type: document.getElementById("type")?.value?.trim() || "",
    date:
      readUsDateInputValue(document.getElementById("date")) ||
      document.getElementById("date")?.value ||
      "",
    endDate:
      readUsDateInputValue(document.getElementById("end_date")) ||
      document.getElementById("end_date")?.value ||
      "",
    startTime: document.getElementById("start_time")?.value || "",
    endTime: document.getElementById("end_time")?.value || "",
    location:
      document.getElementById("location")?.value?.trim() ||
      document.getElementById("locationSearch")?.value?.trim() ||
      "",
    volunteers: document.getElementById("volunteers")?.value || "",
  };
}

function buildLetterBody(form, orgName) {
  return [
    "REQUEST LETTER FOR MISSION APPROVAL",
    "",
    `Date: ${new Date().toLocaleDateString()}`,
    "",
    "Greetings,",
    "",
    "We respectfully request your office's approval for the following mission:",
    "",
    `Mission name: ${form.missionName || "—"}`,
    `Mission type: ${form.type || "—"}`,
    `Schedule: ${form.date || "—"} ${form.startTime || ""} to ${form.endDate || form.date || "—"} ${form.endTime || ""}`.trim(),
    `Location: ${form.location || "—"}`,
    `Volunteers needed: ${form.volunteers || "—"}`,
    "",
    "Description:",
    form.description || "—",
    "",
    "We hope for your favorable consideration.",
    "",
    "Respectfully,",
    orgName || "Organization",
  ].join("\n");
}

function saveLetterDraft(draft) {
  sessionStorage.setItem(LETTER_DRAFT_KEY, JSON.stringify(draft));
}

function readLetterDraft() {
  try {
    const raw = sessionStorage.getItem(LETTER_DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function ensureComposeStyles() {
  if (document.getElementById("missionLetterComposeStyles")) return;
  const style = document.createElement("style");
  style.id = "missionLetterComposeStyles";
  style.textContent = `
    .letter-compose-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.35);
      z-index: 5200;
      display: none;
      align-items: flex-end;
      justify-content: flex-end;
      padding: 0 1rem 1rem;
    }
    .letter-compose-overlay.is-open { display: flex; }
    .letter-compose-overlay[hidden] { display: none !important; }
    .letter-compose {
      width: min(560px, 100%);
      height: min(560px, calc(100vh - 2rem));
      background: #fff;
      border-radius: 12px 12px 0 0;
      box-shadow: 0 12px 40px rgba(0,0,0,0.28);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      font-family: "Segoe UI", Arial, sans-serif;
    }
    .letter-compose.is-expanded {
      width: min(920px, calc(100vw - 2rem));
      height: min(780px, calc(100vh - 2rem));
      border-radius: 12px;
      align-self: center;
      margin: auto;
    }
    .letter-compose-header {
      background: #404040;
      color: #fff;
      padding: 0.65rem 0.85rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
    }
    .letter-compose-header h2 {
      margin: 0;
      font-size: 0.95rem;
      font-weight: 600;
    }
    .letter-compose-header-actions {
      display: flex;
      align-items: center;
      gap: 0.15rem;
    }
    .letter-compose-header-actions button {
      border: none;
      background: transparent;
      color: #fff;
      width: 30px;
      height: 30px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 1rem;
      line-height: 1;
    }
    .letter-compose-header-actions button:hover { background: rgba(255,255,255,0.12); }
    .letter-compose-fields { padding: 0 0.85rem; }
    .letter-compose-row {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      border-bottom: 1px solid #e5e7eb;
      min-height: 42px;
    }
    .letter-compose-row label {
      color: #6b7280;
      font-size: 0.9rem;
      min-width: 52px;
      margin: 0;
    }
    .letter-compose-row input,
    .letter-compose-row select {
      flex: 1;
      border: none;
      outline: none;
      font-size: 0.92rem;
      padding: 0.55rem 0;
      background: transparent;
      min-width: 0;
    }
    .letter-compose-side {
      margin-left: auto;
      display: flex;
      gap: 0.75rem;
      color: #1a73e8;
      font-size: 0.85rem;
      font-weight: 600;
    }
    .letter-compose-side button {
      border: none;
      background: none;
      color: inherit;
      font: inherit;
      cursor: pointer;
      padding: 0;
    }
    .letter-compose-body {
      flex: 1;
      border: none;
      outline: none;
      resize: none;
      padding: 0.85rem;
      font-size: 0.95rem;
      line-height: 1.5;
      color: #111827;
      font-family: inherit;
    }
    .letter-compose-footer {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.65rem 0.85rem 0.85rem;
      border-top: 1px solid #eee;
    }
    .letter-compose-send {
      display: inline-flex;
      align-items: center;
      background: #1a73e8;
      color: #fff;
      border: none;
      border-radius: 999px;
      overflow: hidden;
      font-weight: 600;
    }
    .letter-compose-send-main {
      border: none;
      background: transparent;
      color: inherit;
      padding: 0.55rem 1.1rem;
      font: inherit;
      cursor: pointer;
    }
    .letter-compose-send-caret {
      border: none;
      border-left: 1px solid rgba(255,255,255,0.35);
      background: transparent;
      color: inherit;
      padding: 0.55rem 0.65rem;
      cursor: pointer;
    }
    .letter-compose-tools {
      display: flex;
      align-items: center;
      gap: 0.15rem;
      color: #5f6368;
      margin-left: 0.25rem;
    }
    .letter-compose-tools button,
    .letter-compose-discard {
      border: none;
      background: transparent;
      color: inherit;
      width: 34px;
      height: 34px;
      border-radius: 50%;
      cursor: pointer;
      font-size: 1rem;
    }
    .letter-compose-tools button:hover,
    .letter-compose-discard:hover { background: #f1f3f4; }
    .letter-compose-discard { margin-left: auto; color: #5f6368; }
    .letter-compose-ccbcc[hidden] { display: none !important; }
    @media (max-width: 640px) {
      .letter-compose-overlay {
        align-items: stretch;
        justify-content: stretch;
        padding: 0;
      }
      .letter-compose,
      .letter-compose.is-expanded {
        width: 100%;
        height: 100%;
        border-radius: 0;
      }
    }
  `;
  document.head.appendChild(style);
}

function ensureComposeModal() {
  ensureComposeStyles();
  let overlay = document.getElementById("missionLetterCompose");
  if (overlay) return overlay;

  overlay = document.createElement("div");
  overlay.id = "missionLetterCompose";
  overlay.className = "letter-compose-overlay";
  overlay.hidden = true;
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-labelledby", "letterComposeTitle");
  overlay.innerHTML = `
    <div class="letter-compose" id="letterComposeWindow">
      <div class="letter-compose-header">
        <h2 id="letterComposeTitle">New Message</h2>
        <div class="letter-compose-header-actions">
          <button type="button" id="letterComposeMinimize" title="Minimize" aria-label="Minimize">–</button>
          <button type="button" id="letterComposeExpand" title="Expand" aria-label="Expand">⤢</button>
          <button type="button" id="letterComposeClose" title="Close" aria-label="Close">×</button>
        </div>
      </div>
      <div class="letter-compose-fields">
        <div class="letter-compose-row">
          <label for="letterComposeTo">To</label>
          <input type="text" id="letterComposeTo" list="letterComposeOfficeList" placeholder="Government office email" autocomplete="off">
          <datalist id="letterComposeOfficeList"></datalist>
          <div class="letter-compose-side">
            <button type="button" id="letterComposeCcToggle">Cc</button>
            <button type="button" id="letterComposeBccToggle">Bcc</button>
          </div>
        </div>
        <div class="letter-compose-row letter-compose-ccbcc" id="letterComposeCcRow" hidden>
          <label for="letterComposeCc">Cc</label>
          <input type="text" id="letterComposeCc" placeholder="Cc">
        </div>
        <div class="letter-compose-row letter-compose-ccbcc" id="letterComposeBccRow" hidden>
          <label for="letterComposeBcc">Bcc</label>
          <input type="text" id="letterComposeBcc" placeholder="Bcc">
        </div>
        <div class="letter-compose-row">
          <label for="letterComposeSubject">Subject</label>
          <input type="text" id="letterComposeSubject" placeholder="Subject">
        </div>
      </div>
      <textarea id="letterComposeBody" class="letter-compose-body" placeholder="Write your letter…"></textarea>
      <div class="letter-compose-footer">
        <div class="letter-compose-send">
          <button type="button" class="letter-compose-send-main" id="letterComposeSend">Send</button>
          <button type="button" class="letter-compose-send-caret" aria-label="More send options">▾</button>
        </div>
        <div class="letter-compose-tools" aria-hidden="true">
          <button type="button" title="Formatting"><i class="bi bi-type"></i></button>
          <button type="button" title="Attach"><i class="bi bi-paperclip"></i></button>
          <button type="button" title="Insert link"><i class="bi bi-link-45deg"></i></button>
          <button type="button" title="Emoji"><i class="bi bi-emoji-smile"></i></button>
          <button type="button" title="Insert image"><i class="bi bi-image"></i></button>
        </div>
        <button type="button" class="letter-compose-discard" id="letterComposeDiscard" title="Discard" aria-label="Discard">
          <i class="bi bi-trash"></i>
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  return overlay;
}

function closeComposeModal() {
  const overlay = document.getElementById("missionLetterCompose");
  if (!overlay) return;
  overlay.classList.remove("is-open");
  overlay.setAttribute("hidden", "");
  document.getElementById("letterComposeWindow")?.classList.remove("is-expanded");
}

async function loadOfficeOptions() {
  const list = document.getElementById("letterComposeOfficeList");
  if (!list) return;
  try {
    const snap = await getDocs(collection(db, "government_offices"));
    list.innerHTML = "";
    snap.forEach((docSnap) => {
      const data = docSnap.data() || {};
      const email = data.email || "";
      const name = data.officeName || data.name || "Government office";
      if (!email) return;
      const option = document.createElement("option");
      option.value = email;
      option.label = `${name} <${email}>`;
      list.appendChild(option);
    });
  } catch (error) {
    console.warn("[WARN] Could not load government offices:", error);
  }
}

async function openComposeModal(user) {
  const form = readFormValues();
  if (!form.missionName) {
    alert("Please enter a mission name before submitting a letter.");
    document.getElementById("name")?.focus();
    return;
  }

  const orgName =
    (await fetchOrganizationDisplayName(user)) || user.displayName || "Organization";
  const draft = readLetterDraft();
  const letterBody =
    draft?.letterBody && draft.missionName === form.missionName
      ? draft.letterBody
      : buildLetterBody(form, orgName);

  saveLetterDraft({
    ...form,
    orgId: user.uid,
    orgName,
    orgEmail: user.email || "",
    letterBody,
    generatedAt: new Date().toISOString(),
  });

  const overlay = ensureComposeModal();
  wireComposeOnce(user);
  await loadOfficeOptions();

  const toEl = document.getElementById("letterComposeTo");
  const subjectEl = document.getElementById("letterComposeSubject");
  const bodyEl = document.getElementById("letterComposeBody");
  if (toEl && !toEl.value) toEl.value = "";
  if (subjectEl) {
    subjectEl.value = `Request for Approval: ${form.missionName}`;
  }
  if (bodyEl) bodyEl.value = letterBody;

  overlay.removeAttribute("hidden");
  overlay.classList.add("is-open");
  toEl?.focus();
}

async function sendComposeLetter(user) {
  const to = document.getElementById("letterComposeTo")?.value?.trim() || "";
  const cc = document.getElementById("letterComposeCc")?.value?.trim() || "";
  const bcc = document.getElementById("letterComposeBcc")?.value?.trim() || "";
  const subject = document.getElementById("letterComposeSubject")?.value?.trim() || "";
  const letterBody = document.getElementById("letterComposeBody")?.value?.trim() || "";

  if (!to) {
    alert("Please enter a government office in the To field.");
    document.getElementById("letterComposeTo")?.focus();
    return;
  }
  if (!letterBody) {
    alert("Please write the letter body before sending.");
    document.getElementById("letterComposeBody")?.focus();
    return;
  }

  const form = readFormValues();
  const draft = readLetterDraft() || {};
  const sendBtn = document.getElementById("letterComposeSend");
  if (sendBtn) {
    sendBtn.disabled = true;
    sendBtn.textContent = "Sending…";
  }

  try {
    await addDoc(collection(db, "mission_letters"), {
      orgId: user.uid,
      orgName: draft.orgName || user.displayName || "Organization",
      orgEmail: user.email || "",
      to,
      cc,
      bcc,
      subject,
      missionName: form.missionName || draft.missionName || "",
      missionType: form.type || draft.type || "",
      description: form.description || draft.description || "",
      date: form.date || draft.date || "",
      endDate: form.endDate || draft.endDate || "",
      startTime: form.startTime || draft.startTime || "",
      endTime: form.endTime || draft.endTime || "",
      location: form.location || draft.location || "",
      volunteers: form.volunteers || draft.volunteers || "",
      letterBody,
      status: "pending",
      createdAt: new Date().toISOString(),
      submittedAt: serverTimestamp(),
    });

    closeComposeModal();
    alert("Letter sent to government offices for approval.");
  } catch (error) {
    console.error("[ERROR] Sending mission letter:", error);
    alert("Could not send the letter. Please try again.");
  } finally {
    if (sendBtn) {
      sendBtn.disabled = false;
      sendBtn.textContent = "Send";
    }
  }
}

function wireComposeOnce(user) {
  if (composeWired) return;
  composeWired = true;

  const overlay = document.getElementById("missionLetterCompose");
  const windowEl = document.getElementById("letterComposeWindow");

  document.getElementById("letterComposeClose")?.addEventListener("click", closeComposeModal);
  document.getElementById("letterComposeDiscard")?.addEventListener("click", closeComposeModal);
  document.getElementById("letterComposeMinimize")?.addEventListener("click", closeComposeModal);
  document.getElementById("letterComposeExpand")?.addEventListener("click", () => {
    windowEl?.classList.toggle("is-expanded");
  });
  document.getElementById("letterComposeCcToggle")?.addEventListener("click", () => {
    const row = document.getElementById("letterComposeCcRow");
    if (!row) return;
    row.hidden = !row.hidden;
  });
  document.getElementById("letterComposeBccToggle")?.addEventListener("click", () => {
    const row = document.getElementById("letterComposeBccRow");
    if (!row) return;
    row.hidden = !row.hidden;
  });
  document.getElementById("letterComposeSend")?.addEventListener("click", () => {
    if (currentUser) sendComposeLetter(currentUser);
  });
  overlay?.addEventListener("click", (e) => {
    if (e.target === overlay) closeComposeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay?.classList.contains("is-open")) {
      closeComposeModal();
    }
  });
}

onAuthStateChanged(auth, (user) => {
  if (!user) return;
  currentUser = user;

  document.getElementById("submitLettersBtn")?.addEventListener("click", () => {
    openComposeModal(user);
  });
});
