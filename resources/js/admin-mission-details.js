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

function detailRow(iconClass, label, valueHtml, wide = false) {
    return `
        <div class="org-detail-row${wide ? " org-detail-row--wide" : ""}">
            <div class="org-detail-row__icon"><i class="fas ${iconClass}"></i></div>
            <div class="org-detail-row__content">
                <span class="org-detail-row__label">${escapeHtml(label)}</span>
                <span class="org-detail-row__value">${valueHtml}</span>
            </div>
        </div>`;
}

function sectionLabel(title) {
    return `<div class="org-section-label">${escapeHtml(title)}</div>`;
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

function safeImageHtml(src, alt) {
    const value = String(src || "");
    const allowed = value.startsWith("data:image/") || /^https?:\/\//i.test(value);
    if (!allowed) return "";
    return `<img class="mission-photo" src="${escapeHtml(value)}" alt="${escapeHtml(alt)}">`;
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
    const image = safeImageHtml(mission.missionImage, "Mission image");
    const donation = mission.donationDetails || {};
    const rows = [
        sectionLabel("Mission"),
        detailRow("fa-flag", "Mission Name:", showText(mission.missionName || mission.name)),
        detailRow("fa-building", "Organization:", orgHtml),
        detailRow("fa-tag", "Type:", showText(mission.type)),
        detailRow("fa-info-circle", "Status:", `<span class="org-status-badge ${escapeHtml(statusKey)}">${escapeHtml(statusLabel)}</span>`),
        detailRow("fa-align-left", "Description:", showText(mission.description), true),
    ];

    if (image) {
        rows.push(detailRow("fa-image", "Image:", image, true));
    }

    rows.push(
        sectionLabel("Schedule"),
        detailRow("fa-calendar", "Date:", showText(mission.date)),
        detailRow("fa-calendar-check", "End date:", showText(mission.endDate)),
        detailRow("fa-clock", "Time:", `${showText(mission.startTime)} – ${showText(mission.endTime)}`),
        detailRow("fa-map-marker-alt", "Location:", showText(mission.location), true),
        sectionLabel("Volunteers"),
        detailRow("fa-users", "Volunteers needed:", showText(mission.volunteers)),
        detailRow(
            "fa-user-check",
            "Auto-accept volunteers:",
            mission.autoAcceptVolunteers ? "Yes" : "No"
        ),
        sectionLabel("Submission"),
        detailRow("fa-paper-plane", "Submitted:", formatSubmittedAt(mission)),
        detailRow("fa-user", "Submitted by:", showText(mission.submittedBy)),
        detailRow("fa-fingerprint", "Mission ID:", showText(missionId))
    );

    if (mission.makeDonations) {
        rows.push(
            sectionLabel("Donations"),
            detailRow("fa-hand-holding-heart", "Donations:", "Enabled"),
            detailRow("fa-wallet", "Method:", showText(donation.method)),
            detailRow("fa-user", "Account name:", showText(donation.accountName)),
            detailRow("fa-phone", "Account number:", showText(donation.gcashNumber))
        );
        if (donation.note) {
            rows.push(detailRow("fa-comment", "Donation note:", showText(donation.note), true));
        }
    }

    if (statusKey === "rejected") {
        rows.push(
            sectionLabel("Review"),
            detailRow(
                "fa-comment-dots",
                "Rejection reason:",
                showText(mission.rejectionReason || "No reason provided"),
                true
            )
        );
    }

    const body = document.getElementById("missionPageBody");
    const status = document.getElementById("missionPageStatus");
    const footer = document.getElementById("missionPageFooter");
    const actions = document.getElementById("missionPageActions");
    if (body) {
        body.hidden = false;
        body.innerHTML = `<div class="org-fields">${rows.join("")}</div>`;
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
