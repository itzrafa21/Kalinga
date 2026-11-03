import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "firebase/auth";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { fetchOrganizationDisplayName } from "./org-verification.js";
import { readUsDateInputValue } from "./us-date-input.js";

const LETTER_DRAFT_KEY = "kalinga-mission-letter-draft";

function readFormValues() {
  return {
    missionName: document.getElementById("name")?.value?.trim() || "",
    description: document.getElementById("description")?.value?.trim() || "",
    type: document.getElementById("type")?.value?.trim() || "",
    date: readUsDateInputValue(document.getElementById("date")) || document.getElementById("date")?.value || "",
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
    "To: Concerned Government Office",
    "",
    `From: ${orgName || "Organization"}`,
    "",
    "Subject: Request for Approval of Community Mission",
    "",
    "Greetings,",
    "",
    `We respectfully request your office's approval for the following mission:`,
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

function ensureLetterModal() {
  let overlay = document.getElementById("missionLetterModal");
  if (overlay) return overlay;

  overlay = document.createElement("div");
  overlay.id = "missionLetterModal";
  overlay.className = "success-modal-overlay";
  overlay.hidden = true;
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("role", "dialog");
  overlay.innerHTML = `
    <div class="success-modal" role="document" style="max-width:560px;text-align:left">
      <div class="success-modal-icon" aria-hidden="true" style="text-align:center">
        <i class="bi bi-file-earmark-text"></i>
      </div>
      <h2 id="missionLetterModalTitle" style="text-align:center">Request letter</h2>
      <p class="success-modal-message" id="missionLetterModalMessage" style="text-align:center;margin-bottom:0.75rem"></p>
      <pre id="missionLetterPreview" style="white-space:pre-wrap;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:0.9rem 1rem;max-height:280px;overflow:auto;font-size:0.88rem;color:#334155;margin:0 0 1rem"></pre>
      <div class="success-modal-actions" style="justify-content:center;display:flex;gap:0.5rem;flex-wrap:wrap">
        <button type="button" class="success-modal-confirm" id="missionLetterModalOk">OK</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const close = () => {
    overlay.classList.remove("is-open");
    overlay.setAttribute("hidden", "");
  };
  document.getElementById("missionLetterModalOk")?.addEventListener("click", close);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
  return overlay;
}

function openLetterModal(title, message, body) {
  const overlay = ensureLetterModal();
  const titleEl = document.getElementById("missionLetterModalTitle");
  const messageEl = document.getElementById("missionLetterModalMessage");
  const preview = document.getElementById("missionLetterPreview");
  if (titleEl) titleEl.textContent = title;
  if (messageEl) messageEl.textContent = message;
  if (preview) preview.textContent = body;
  overlay.removeAttribute("hidden");
  overlay.classList.add("is-open");
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

async function generateLetter(user) {
  const form = readFormValues();
  if (!form.missionName) {
    alert("Please enter a mission name before generating a request letter.");
    document.getElementById("name")?.focus();
    return;
  }

  const orgName = (await fetchOrganizationDisplayName(user)) || user.displayName || "Organization";
  const letterBody = buildLetterBody(form, orgName);
  const draft = {
    ...form,
    orgId: user.uid,
    orgName,
    orgEmail: user.email || "",
    letterBody,
    generatedAt: new Date().toISOString(),
  };
  saveLetterDraft(draft);
  openLetterModal(
    "Request letter generated",
    "Review the letter below. You can submit it to government offices when ready.",
    letterBody
  );
}

async function submitLetter(user) {
  let draft = readLetterDraft();
  if (!draft?.letterBody) {
    await generateLetter(user);
    draft = readLetterDraft();
  }
  if (!draft?.letterBody) return;

  const submitBtn = document.getElementById("submitLettersBtn");
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting…";
  }

  try {
    await addDoc(collection(db, "mission_letters"), {
      orgId: user.uid,
      orgName: draft.orgName || user.displayName || "Organization",
      orgEmail: user.email || "",
      missionName: draft.missionName || "",
      missionType: draft.type || "",
      description: draft.description || "",
      date: draft.date || "",
      endDate: draft.endDate || "",
      startTime: draft.startTime || "",
      endTime: draft.endTime || "",
      location: draft.location || "",
      volunteers: draft.volunteers || "",
      letterBody: draft.letterBody,
      status: "pending",
      createdAt: new Date().toISOString(),
      submittedAt: serverTimestamp(),
    });

    openLetterModal(
      "Letter submitted",
      "Your request letter was submitted to government offices for approval.",
      draft.letterBody
    );
  } catch (error) {
    console.error("[ERROR] Submitting mission letter:", error);
    alert("Could not submit the letter. Please try again.");
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="bi bi-send"></i> Submit Letters to Government officers';
    }
  }
}

onAuthStateChanged(auth, (user) => {
  if (!user) return;

  document.getElementById("generateRequestLettersBtn")?.addEventListener("click", () => {
    generateLetter(user);
  });
  document.getElementById("submitLettersBtn")?.addEventListener("click", () => {
    submitLetter(user);
  });
});
