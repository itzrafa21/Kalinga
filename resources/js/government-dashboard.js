import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

let currentFilter = "pending";
let lettersCache = [];

function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatWhen(value) {
  if (!value) return "—";
  try {
    const date = value.toDate ? value.toDate() : new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleString();
  } catch {
    return "—";
  }
}

function statusClass(status) {
  const s = String(status || "pending").toLowerCase();
  if (s === "approved") return "approved";
  if (s === "rejected") return "rejected";
  return "pending";
}

function renderLetters() {
  const list = document.getElementById("govLettersList");
  if (!list) return;

  const filtered =
    currentFilter === "all"
      ? lettersCache
      : lettersCache.filter(
          (item) => String(item.status || "pending").toLowerCase() === currentFilter
        );

  if (!filtered.length) {
    list.innerHTML = `<div class="gov-empty">No ${currentFilter === "all" ? "" : currentFilter + " "}letters yet.</div>`;
    return;
  }

  list.innerHTML = filtered
    .map((letter) => {
      const status = String(letter.status || "pending").toLowerCase();
      const canDecide = status === "pending";
      return `
        <article class="gov-letter-card" data-id="${escapeHtml(letter.id)}">
          <div class="gov-letter-top">
            <div>
              <h2 class="gov-letter-title">${escapeHtml(letter.missionName || "Untitled mission")}</h2>
              <p class="gov-letter-meta">
                From ${escapeHtml(letter.orgName || "Organization")}
                · ${escapeHtml(letter.missionType || "General")}
                · Submitted ${escapeHtml(formatWhen(letter.submittedAt || letter.createdAt))}
              </p>
            </div>
            <span class="gov-status ${statusClass(status)}">${escapeHtml(status)}</span>
          </div>
          <div class="gov-letter-body">${escapeHtml(letter.letterBody || "No letter content.")}</div>
          ${
            canDecide
              ? `<div class="gov-letter-actions">
                  <button type="button" class="gov-btn-approve" data-action="approve">Approve</button>
                  <button type="button" class="gov-btn-reject" data-action="reject">Reject</button>
                </div>`
              : letter.reviewedNote
                ? `<p class="gov-letter-meta">${escapeHtml(letter.reviewedNote)}</p>`
                : ""
          }
        </article>
      `;
    })
    .join("");
}

async function loadLetters() {
  const list = document.getElementById("govLettersList");
  if (list) list.innerHTML = `<div class="gov-empty">Loading letters…</div>`;

  try {
    const q = query(collection(db, "mission_letters"), orderBy("submittedAt", "desc"));
    const snap = await getDocs(q);
    lettersCache = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.warn("[WARN] orderBy mission_letters failed, falling back:", error);
    const snap = await getDocs(collection(db, "mission_letters"));
    lettersCache = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => {
        const ta = a.submittedAt?.toMillis?.() || Date.parse(a.createdAt || 0) || 0;
        const tb = b.submittedAt?.toMillis?.() || Date.parse(b.createdAt || 0) || 0;
        return tb - ta;
      });
  }
  renderLetters();
}

async function decideLetter(letterId, decision) {
  const note =
    decision === "approved"
      ? "Approved by government office."
      : "Rejected by government office.";
  await updateDoc(doc(db, "mission_letters", letterId), {
    status: decision,
    reviewedAt: serverTimestamp(),
    reviewedNote: note,
  });
  const item = lettersCache.find((l) => l.id === letterId);
  if (item) {
    item.status = decision;
    item.reviewedNote = note;
  }
  renderLetters();
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".gov-filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".gov-filter-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentFilter = btn.dataset.filter || "pending";
      renderLetters();
    });
  });

  document.getElementById("govLettersList")?.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const card = btn.closest(".gov-letter-card");
    const letterId = card?.dataset.id;
    if (!letterId) return;
    const action = btn.dataset.action;
    btn.disabled = true;
    try {
      await decideLetter(letterId, action === "approve" ? "approved" : "rejected");
    } catch (error) {
      console.error("[ERROR] Updating letter:", error);
      alert("Could not update this letter. Please try again.");
      btn.disabled = false;
    }
  });
});

onAuthStateChanged(auth, async (user) => {
  if (!user) return;
  try {
    const snap = await getDoc(doc(db, "government_offices", user.uid));
    const data = snap.exists() ? snap.data() : null;
    const welcome = document.getElementById("govOfficeWelcome");
    if (welcome) {
      welcome.textContent = data?.officeName || data?.name || user.displayName || "Government Office";
    }
  } catch (error) {
    console.warn("[WARN] Could not load office name:", error);
  }
  await loadLetters();
});
