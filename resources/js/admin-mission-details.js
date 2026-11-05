import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
    deleteDoc,
    deleteField,
    doc,
    getDoc,
    serverTimestamp,
    setDoc,
    updateDoc,
} from "firebase/firestore";
import { computeMissionPointsPayload } from "./mission-type-points.js";
import { fetchOrganizationDisplayName } from "./org-verification.js";
import {
    sanitizeCloudinaryDocumentUrl,
    normalizeMissionDocuments,
    downloadCloudinaryDocument,
    candidateCloudinaryDocumentUrls,
} from "./cloudinary-upload.js";

const missionId = document.body.dataset.missionId || "";

function escapeHtml(text) {
    return String(text ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function isAdminEmail(email) {
    const value = String(email || "");
    return value.includes("@admin.kalinga.com") || value.includes("admin@");
}

function showText(value) {
    const text = String(value ?? "").trim();
    return text ? escapeHtml(text) : "—";
}

function detailRow(iconClass, label, valueHtml) {
    return `
        <div class="org-detail-row">
            <div class="org-detail-row__icon"><i class="fas ${iconClass}"></i></div>
            <div class="org-detail-row__content">
                <span class="org-detail-row__label">${escapeHtml(label)}</span>
                <span class="org-detail-row__value">${valueHtml}</span>
            </div>
        </div>`;
}

function fieldsPanel(title, rowsHtml) {
    return `
        <div class="org-fields">
            <h3 class="org-detail-panel__title">${escapeHtml(title)}</h3>
            ${rowsHtml}
        </div>`;
}

function wireDetailTabs(root, initialTab = "mission") {
    const tabs = Array.from(root.querySelectorAll("[data-org-tab]"));
    const panels = Array.from(root.querySelectorAll("[data-org-panel]"));
    if (!tabs.length || !panels.length) return;

    const activate = (key) => {
        tabs.forEach((tab) => {
            const active = tab.getAttribute("data-org-tab") === key;
            tab.classList.toggle("active", active);
            tab.setAttribute("aria-selected", active ? "true" : "false");
        });
        panels.forEach((panel) => {
            panel.hidden = panel.getAttribute("data-org-panel") !== key;
        });
    };

    tabs.forEach((tab) => {
        tab.addEventListener("click", () => {
            activate(tab.getAttribute("data-org-tab") || initialTab);
        });
    });

    const hasInitial = tabs.some((tab) => tab.getAttribute("data-org-tab") === initialTab);
    activate(hasInitial ? initialTab : tabs[0].getAttribute("data-org-tab") || initialTab);
}

function wireMissionDocumentsDownloads(root) {
    const list = root?.querySelector?.(".mission-docs");
    if (!list || list.dataset.downloadWired === "1") return;
    list.dataset.downloadWired = "1";
    list.addEventListener("click", (event) => {
        const link = event.target.closest("a.mission-doc-link");
        if (!link || list.contains(link) === false) return;
        const url = link.getAttribute("href") || "";
        const name =
            link.getAttribute("data-download-name") ||
            link.getAttribute("download") ||
            "document";
        if (!url || url === "#") return;
        event.preventDefault();
        event.stopPropagation();
        void downloadCloudinaryDocument(url, name);
    });
}

function formatSubmittedAt(mission) {
    const submitted = mission.submittedAt || mission.createdAt;
    if (submitted?.toDate) return escapeHtml(submitted.toDate().toLocaleString());
    if (submitted) {
        const date = new Date(submitted);
        if (!Number.isNaN(date.getTime())) return escapeHtml(date.toLocaleString());
    }
    return "—";
}

function missionImageDownloadHtml(src) {
    const value = String(src || "").trim();
    const allowed =
        value.startsWith("data:image/") ||
        /^https?:\/\//i.test(value) ||
        value.startsWith("//");
    if (!allowed) return "";
    const href = value.startsWith("//") ? `https:${value}` : value;
    const fileName = "mission-image.jpg";
    return `
        <span class="org-doc-meta">
            <a class="org-doc-download" href="${escapeHtml(href)}" download="${escapeHtml(fileName)}" target="_blank" rel="noopener noreferrer">${escapeHtml(fileName)}</a>
            <span class="org-doc-meta__sub">Click to download</span>
        </span>`;
}

function formatDocumentSize(bytes) {
    const size = Number(bytes) || 0;
    if (size <= 0) return "";
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function setStatus(message, isError = false) {
    const status = document.getElementById("missionPageStatus");
    const body = document.getElementById("missionPageBody");
    const footer = document.getElementById("missionPageFooter");
    if (body) body.hidden = true;
    if (footer) footer.hidden = true;
    if (!status) return;
    status.hidden = false;
    status.textContent = message;
    status.classList.toggle("is-error", isError);
}

function openOverlay(id) {
    const overlay = document.getElementById(id);
    if (!overlay) return;
    overlay.hidden = false;
    overlay.classList.add("is-open");
}

function closeOverlay(id) {
    const overlay = document.getElementById(id);
    if (!overlay) return;
    overlay.hidden = true;
    overlay.classList.remove("is-open");
}

async function loadMissionSnap() {
    let snap = await getDoc(doc(db, "mission_submissions", missionId));
    if (!snap.exists()) {
        snap = await getDoc(doc(db, "missions", missionId));
    }
    return snap;
}

function renderMission(mission, orgDisplayName) {
    const statusKey = String(mission.status || "pending").toLowerCase();
    const statusLabel = String(mission.status || "Pending").toUpperCase();
    const orgHtml = mission.orgId
        ? `<a href="/admin/organizations/${encodeURIComponent(mission.orgId)}">${escapeHtml(orgDisplayName)}</a>`
        : escapeHtml(orgDisplayName);
    const imageHtml = missionImageDownloadHtml(mission.missionImage);
    const donation = mission.donationDetails || {};
    const hasDonations = Boolean(mission.makeDonations);
    const hasReview = statusKey === "rejected";

    const docs = normalizeMissionDocuments(mission.documents).filter((d) => {
        const url = String(d?.url || "").trim();
        return url && (/^https?:\/\//i.test(url) || url.startsWith("data:"));
    });

    const missionRows = [
        detailRow("fa-flag", "Mission Name:", showText(mission.missionName || mission.name)),
        detailRow("fa-building", "Organization:", orgHtml),
        detailRow("fa-tag", "Type:", showText(mission.type)),
        detailRow(
            "fa-info-circle",
            "Status:",
            `<span class="org-status-badge ${escapeHtml(statusKey)}">${escapeHtml(statusLabel)}</span>`
        ),
        detailRow("fa-align-left", "Description:", showText(mission.description)),
        imageHtml ? detailRow("fa-image", "Mission Image:", imageHtml) : "",
    ]
        .filter(Boolean)
        .join("");

    const scheduleRows = [
        detailRow("fa-calendar", "Date:", showText(mission.date)),
        detailRow("fa-calendar-check", "End date:", showText(mission.endDate)),
        detailRow(
            "fa-clock",
            "Time:",
            `${showText(mission.startTime)} – ${showText(mission.endTime)}`
        ),
        detailRow("fa-map-marker-alt", "Location:", showText(mission.location)),
    ].join("");

    const volunteersRows = [
        detailRow("fa-users", "Volunteers needed:", showText(mission.volunteers)),
        detailRow(
            "fa-user-check",
            "Auto-accept volunteers:",
            mission.autoAcceptVolunteers ? "Yes" : "No"
        ),
    ].join("");

    const documentsRows = docs.length
        ? detailRow(
              "fa-folder-open",
              "Files:",
              `<div class="mission-docs">${docs
                  .map((docItem, index) => {
                      const name =
                          String(docItem.name || "document").trim() || "document";
                      const format = String(docItem.format || "").toUpperCase();
                      const sizeLabel = formatDocumentSize(docItem.size);
                      const meta = [format, sizeLabel].filter(Boolean).join(" · ");
                      const candidates = candidateCloudinaryDocumentUrls(
                          String(docItem.url)
                      );
                      const href =
                          candidates.find((u) => u.includes("/raw/upload/")) ||
                          candidates[0] ||
                          sanitizeCloudinaryDocumentUrl(String(docItem.url));
                      return `
                        <span class="org-doc-meta">
                          <a class="mission-doc-link org-doc-download" href="${escapeHtml(href)}" data-doc-index="${index}" data-download-name="${escapeHtml(name)}" download="${escapeHtml(name)}" rel="noopener noreferrer">${escapeHtml(name)}</a>
                          ${meta ? `<span class="org-doc-meta__sub">${escapeHtml(meta)}</span>` : ""}
                        </span>`;
                  })
                  .join("")}</div>`
          )
        : detailRow("fa-folder-open", "Files:", "—");

    const submissionRows = [
        detailRow("fa-paper-plane", "Submitted:", formatSubmittedAt(mission)),
        detailRow("fa-user", "Submitted by:", showText(mission.submittedBy)),
        detailRow("fa-fingerprint", "Mission ID:", showText(missionId)),
    ].join("");

    const donationRows = hasDonations
        ? [
              detailRow("fa-hand-holding-heart", "Donations:", "Enabled"),
              detailRow("fa-wallet", "Method:", showText(donation.method)),
              detailRow("fa-user", "Account name:", showText(donation.accountName)),
              detailRow("fa-phone", "Account number:", showText(donation.gcashNumber)),
              donation.note
                  ? detailRow("fa-comment", "Donation note:", showText(donation.note))
                  : "",
          ]
              .filter(Boolean)
              .join("")
        : "";

    const reviewRows = hasReview
        ? detailRow(
              "fa-comment-dots",
              "Rejection reason:",
              showText(mission.rejectionReason || "No reason provided")
          )
        : "";

    const tabsHtml = `
        <div class="org-detail-tabs" role="tablist" aria-label="Mission detail sections">
            <button type="button" class="org-detail-tab active" role="tab" aria-selected="true" data-org-tab="mission">A. Mission</button>
            <button type="button" class="org-detail-tab" role="tab" aria-selected="false" data-org-tab="schedule">Schedule</button>
            <button type="button" class="org-detail-tab" role="tab" aria-selected="false" data-org-tab="volunteers">Volunteers</button>
            <button type="button" class="org-detail-tab" role="tab" aria-selected="false" data-org-tab="documents">Documents</button>
            ${
                hasDonations
                    ? `<button type="button" class="org-detail-tab" role="tab" aria-selected="false" data-org-tab="donations">Donations</button>`
                    : ""
            }
            <button type="button" class="org-detail-tab" role="tab" aria-selected="false" data-org-tab="submission">Submission</button>
            ${
                hasReview
                    ? `<button type="button" class="org-detail-tab" role="tab" aria-selected="false" data-org-tab="review">Review</button>`
                    : ""
            }
        </div>`;

    const panelsHtml = `
        <section class="org-detail-panel" data-org-panel="mission" role="tabpanel">
            ${fieldsPanel("A. Mission", missionRows)}
        </section>
        <section class="org-detail-panel" data-org-panel="schedule" role="tabpanel" hidden>
            ${fieldsPanel("Schedule", scheduleRows)}
        </section>
        <section class="org-detail-panel" data-org-panel="volunteers" role="tabpanel" hidden>
            ${fieldsPanel("Volunteers", volunteersRows)}
        </section>
        <section class="org-detail-panel" data-org-panel="documents" role="tabpanel" hidden>
            ${fieldsPanel("Documents", documentsRows)}
        </section>
        ${
            hasDonations
                ? `<section class="org-detail-panel" data-org-panel="donations" role="tabpanel" hidden>
                    ${fieldsPanel("Donations", donationRows)}
                   </section>`
                : ""
        }
        <section class="org-detail-panel" data-org-panel="submission" role="tabpanel" hidden>
            ${fieldsPanel("Submission", submissionRows)}
        </section>
        ${
            hasReview
                ? `<section class="org-detail-panel" data-org-panel="review" role="tabpanel" hidden>
                    ${fieldsPanel("Review", reviewRows)}
                   </section>`
                : ""
        }`;

    const body = document.getElementById("missionPageBody");
    const status = document.getElementById("missionPageStatus");
    const footer = document.getElementById("missionPageFooter");
    const actions = document.getElementById("missionPageActions");
    if (body) {
        body.hidden = false;
        body.innerHTML = `${tabsHtml}${panelsHtml}`;
        wireDetailTabs(body, "mission");
        wireMissionDocumentsDownloads(body);
    }
    if (status) status.hidden = true;
    if (footer) footer.hidden = false;

    if (actions) {
        actions.innerHTML =
            statusKey === "pending"
                ? `<button type="button" class="org-action org-action--reject" id="missionRejectBtn"><i class="fas fa-times"></i> Reject</button>
                   <button type="button" class="org-action org-action--verify" id="missionApproveBtn"><i class="fas fa-check"></i> Approve</button>`
                : "";
        document.getElementById("missionApproveBtn")?.addEventListener("click", approveMission);
        document.getElementById("missionRejectBtn")?.addEventListener("click", openRejectModal);
    }
}

async function loadMission() {
    if (!missionId) {
        setStatus("Mission not found.", true);
        return;
    }
    try {
        const snap = await loadMissionSnap();
        if (!snap.exists()) {
            setStatus("Mission not found.", true);
            return;
        }
        const mission = snap.data();
        const orgDisplayName = await fetchOrganizationDisplayName(mission.orgId, mission.orgName);
        renderMission(mission, orgDisplayName);
    } catch (error) {
        console.error(error);
        setStatus("Could not load mission.", true);
    }
}

async function approveMission() {
    const button = document.getElementById("missionApproveBtn");
    if (button) button.disabled = true;
    try {
        const submissionRef = doc(db, "mission_submissions", missionId);
        const submissionDoc = await getDoc(submissionRef);
        if (!submissionDoc.exists()) {
            alert("Mission submission not found.");
            if (button) button.disabled = false;
            return;
        }

        const submissionData = submissionDoc.data();
        const { basePoints: _legacyBase, ...submissionWithoutBase } = submissionData;
        const pointsFields = await computeMissionPointsPayload(submissionWithoutBase);
        const approvedMissionData = {
            ...submissionWithoutBase,
            ...pointsFields,
            status: "Open",
            workflowStatus: "approved",
            approvedAt: serverTimestamp(),
            approvedBy: auth.currentUser?.email || "",
        };

        await setDoc(doc(db, "missions", missionId), approvedMissionData);
        if (submissionData.orgId) {
            await setDoc(
                doc(db, "organizations", submissionData.orgId, "missions", missionId),
                approvedMissionData
            );
        }
        await updateDoc(submissionRef, {
            ...pointsFields,
            basePoints: deleteField(),
            workflowStatus: "approved",
            status: "Open",
            approvedAt: serverTimestamp(),
            approvedBy: auth.currentUser?.email || "",
        });

        await loadMission();
        openOverlay("missionApproveSuccessModal");
    } catch (error) {
        console.error(error);
        alert("Error approving mission. Please try again.");
        if (button) button.disabled = false;
    }
}

function openRejectModal() {
    const textarea = document.getElementById("missionRejectReasonInput");
    const err = document.getElementById("missionRejectReasonError");
    if (textarea) textarea.value = "";
    if (err) err.textContent = "";
    openOverlay("missionRejectModal");
    textarea?.focus();
}

async function confirmReject() {
    const textarea = document.getElementById("missionRejectReasonInput");
    const err = document.getElementById("missionRejectReasonError");
    const reason = (textarea?.value || "").trim();
    if (!reason) {
        if (err) err.textContent = "A rejection reason is required.";
        textarea?.focus();
        return;
    }
    if (err) err.textContent = "";
    closeOverlay("missionRejectModal");

    try {
        const submissionRef = doc(db, "mission_submissions", missionId);
        const submissionSnap = await getDoc(submissionRef);
        if (!submissionSnap.exists()) {
            alert("Mission submission not found.");
            return;
        }

        const submissionData = submissionSnap.data();
        const rejectionUpdate = {
            status: "rejected",
            workflowStatus: "rejected",
            rejectedAt: serverTimestamp(),
            rejectedBy: auth.currentUser?.email || "",
            rejectionReason: reason,
        };

        await updateDoc(submissionRef, rejectionUpdate);

        if (submissionData.orgId) {
            await updateDoc(
                doc(db, "organizations", submissionData.orgId, "missions", missionId),
                rejectionUpdate
            );
            await setDoc(
                doc(db, "organizations", submissionData.orgId, "history", missionId),
                {
                    ...submissionData,
                    ...rejectionUpdate,
                    status: "rejected",
                    movedToHistoryAt: new Date(),
                }
            );
            await deleteDoc(doc(db, "organizations", submissionData.orgId, "missions", missionId));
        }

        await loadMission();
    } catch (error) {
        console.error(error);
        alert("Error rejecting mission. Please try again.");
    }
}

document.getElementById("adminLogoutBtn")?.addEventListener("click", async (event) => {
    event.preventDefault();
    if (!confirm("Are you sure you want to logout?")) return;
    try {
        await signOut(auth);
    } catch (error) {
        console.error(error);
    }
    localStorage.removeItem("adminUser");
    window.location.href = "/admin/login";
});

document.getElementById("missionApproveSuccessOk")?.addEventListener("click", () => {
    closeOverlay("missionApproveSuccessModal");
});
document.getElementById("missionApproveSuccessModal")?.addEventListener("click", (event) => {
    if (event.target === event.currentTarget) closeOverlay("missionApproveSuccessModal");
});
document.getElementById("missionRejectCancel")?.addEventListener("click", () => closeOverlay("missionRejectModal"));
document.getElementById("missionRejectConfirm")?.addEventListener("click", confirmReject);
document.getElementById("missionRejectModal")?.addEventListener("click", (event) => {
    if (event.target === event.currentTarget) closeOverlay("missionRejectModal");
});
document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    closeOverlay("missionRejectModal");
    closeOverlay("missionApproveSuccessModal");
});

onAuthStateChanged(auth, async (user) => {
    if (!user || !isAdminEmail(user.email)) {
        window.location.href = "/admin/login";
        return;
    }
    const email = user.email || "";
    const topbar = document.getElementById("adminEmail");
    const sidebar = document.getElementById("adminEmailSidebar");
    if (topbar) topbar.textContent = email;
    if (sidebar) sidebar.textContent = email;
    await loadMission();
});
