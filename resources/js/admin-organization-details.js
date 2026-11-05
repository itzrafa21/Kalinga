import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
    deleteField,
    doc,
    getDoc,
    serverTimestamp,
    updateDoc,
} from "firebase/firestore";
import {
    getOrgVerificationKey,
    getOrgVerificationLabel,
    ORG_VERIFICATION_STATUS,
} from "./org-verification.js";

const orgId = document.body.dataset.orgId || "";

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

function joinedList(primary, extras) {
    const values = [];
    const add = (item) => {
        const text = String(item ?? "").trim();
        if (text && !values.includes(text)) values.push(text);
    };
    add(primary);
    if (Array.isArray(extras)) extras.forEach(add);
    return values.length ? escapeHtml(values.join(", ")) : "—";
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

function websiteHtml(primary, extras) {
    const values = [];
    const add = (item) => {
        const text = String(item ?? "").trim();
        if (text && !values.includes(text)) values.push(text);
    };
    add(primary);
    if (Array.isArray(extras)) extras.forEach(add);
    if (!values.length) return "—";
    return values
        .map((site) => {
            const href = /^https?:\/\//i.test(site) ? site : `https://${site}`;
            return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(site)}</a>`;
        })
        .join(", ");
}

function renderOrganization(data) {
    const statusKey = getOrgVerificationKey(data);
    const statusLabel = getOrgVerificationLabel(data).toUpperCase();
    const rep = data.representative || {};
    const name = data.name || data.orgName || "";
    const address = data.completeAddress || data.address || "";

    const rows = [
        sectionLabel("Organization"),
        detailRow("fa-building", "Organization Name:", showText(name)),
        detailRow("fa-tag", "Type:", showText(data.orgType)),
        detailRow("fa-calendar", "Year established:", showText(data.yearEstablished)),
        detailRow("fa-earth-asia", "Scope:", showText(data.orgScope)),
        detailRow("fa-align-left", "Description:", showText(data.orgDescription), true),
        detailRow(
            "fa-check-circle",
            "Status:",
            `<span class="org-status-badge ${escapeHtml(statusKey)}">${escapeHtml(statusLabel)}</span>`
        ),
        detailRow("fa-fingerprint", "Org ID:", showText(orgId)),
        sectionLabel("Contact"),
        detailRow("fa-envelope", "Email:", joinedList(data.email || data.orgEmail, data.orgEmails)),
        detailRow("fa-phone", "Phone:", joinedList(data.phone || data.orgContactNumber, data.orgContactNumbers)),
        detailRow("fa-link", "Website:", websiteHtml(data.orgWebsite, data.orgWebsites)),
        sectionLabel("Location"),
        detailRow("fa-map-marker-alt", "Address:", showText(address), true),
        detailRow("fa-city", "City:", showText(data.city)),
        detailRow("fa-map", "State / Province:", showText(data.state)),
        detailRow("fa-mail-bulk", "Postal Code:", showText(data.postalCode)),
        detailRow("fa-globe", "Country:", showText(data.country)),
        sectionLabel("Representative"),
        detailRow("fa-user", "Full name:", showText(rep.fullName)),
        detailRow("fa-id-badge", "Position:", showText(rep.position)),
        detailRow("fa-envelope", "Email:", showText(rep.email)),
        detailRow("fa-phone", "Contact number:", showText(rep.contactNumber)),
    ];

    if (data.rejectionReason) {
        rows.push(
            sectionLabel("Review"),
            detailRow("fa-comment-alt", "Rejection reason:", showText(data.rejectionReason), true)
        );
    }

    const body = document.getElementById("orgPageBody");
    const status = document.getElementById("orgPageStatus");
    const footer = document.getElementById("orgPageFooter");
    const actions = document.getElementById("orgPageActions");
    if (body) {
        body.hidden = false;
        body.innerHTML = `<div class="org-fields">${rows.join("")}</div>`;
    }
    if (status) status.hidden = true;
    if (footer) footer.hidden = false;

    if (actions) {
        const verifyBtn =
            statusKey !== "verified"
                ? `<button type="button" class="org-action org-action--verify" id="orgVerifyBtn"><i class="fas fa-check"></i> Verify organization</button>`
                : "";
        const rejectBtn =
            statusKey !== "rejected"
                ? `<button type="button" class="org-action org-action--reject" id="orgRejectBtn"><i class="fas fa-times"></i> Reject</button>`
                : "";
        actions.innerHTML = `${rejectBtn}${verifyBtn}`;
        document.getElementById("orgVerifyBtn")?.addEventListener("click", () => verifyOrganization(name));
        document.getElementById("orgRejectBtn")?.addEventListener("click", openRejectModal);
    }
}

function setStatus(message, isError = false) {
    const status = document.getElementById("orgPageStatus");
    const body = document.getElementById("orgPageBody");
    const footer = document.getElementById("orgPageFooter");
    if (body) body.hidden = true;
    if (footer) footer.hidden = true;
    if (!status) return;
    status.hidden = false;
    status.textContent = message;
    status.classList.toggle("is-error", isError);
}

async function loadOrganization() {
    if (!orgId) {
        setStatus("Organization not found.", true);
        return;
    }
    try {
        const snap = await getDoc(doc(db, "organizations", orgId));
        if (!snap.exists()) {
            setStatus("Organization not found.", true);
            return;
        }
        renderOrganization(snap.data());
    } catch (error) {
        console.error(error);
        setStatus("Could not load organization.", true);
    }
}

async function setOrganizationVerification(status, rejectionReason = "") {
    const ref = doc(db, "organizations", orgId);
    const adminUid = auth.currentUser?.uid || null;

    if (status === ORG_VERIFICATION_STATUS.APPROVED) {
        await updateDoc(ref, {
            verified: true,
            verificationStatus: ORG_VERIFICATION_STATUS.APPROVED,
            verifiedAt: serverTimestamp(),
            verifiedBy: adminUid,
            rejectedAt: deleteField(),
            rejectionReason: deleteField(),
        });
        return;
    }

    if (status === ORG_VERIFICATION_STATUS.REJECTED) {
        const reason = String(rejectionReason || "").trim();
        await updateDoc(ref, {
            verified: false,
            verificationStatus: ORG_VERIFICATION_STATUS.REJECTED,
            rejectedAt: serverTimestamp(),
            verifiedBy: adminUid,
            rejectionReason: reason || deleteField(),
        });
    }
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

async function verifyOrganization(orgName) {
    const button = document.getElementById("orgVerifyBtn");
    if (button) button.disabled = true;
    try {
        await setOrganizationVerification(ORG_VERIFICATION_STATUS.APPROVED);
        await loadOrganization();
        const message = document.getElementById("orgVerifySuccessMessage");
        const name = String(orgName || "").trim();
        if (message) {
            message.textContent = name
                ? `${name} has been verified successfully. They can now sign in to the organization dashboard.`
                : "The organization has been verified successfully. They can now sign in to the dashboard.";
        }
        openOverlay("orgVerifySuccessModal");
    } catch (error) {
        console.error(error);
        alert("Could not verify organization.");
        if (button) button.disabled = false;
    }
}

function openRejectModal() {
    const textarea = document.getElementById("orgRejectReasonInput");
    if (textarea) textarea.value = "";
    openOverlay("orgRejectModal");
    textarea?.focus();
}

async function confirmReject() {
    const textarea = document.getElementById("orgRejectReasonInput");
    const reason = textarea?.value || "";
    closeOverlay("orgRejectModal");
    try {
        await setOrganizationVerification(ORG_VERIFICATION_STATUS.REJECTED, reason);
        await loadOrganization();
    } catch (error) {
        console.error(error);
        alert("Could not reject organization. Please try again.");
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

document.getElementById("orgVerifySuccessOk")?.addEventListener("click", () => {
    closeOverlay("orgVerifySuccessModal");
});
document.getElementById("orgVerifySuccessModal")?.addEventListener("click", (event) => {
    if (event.target === event.currentTarget) closeOverlay("orgVerifySuccessModal");
});
document.getElementById("orgRejectCancel")?.addEventListener("click", () => closeOverlay("orgRejectModal"));
document.getElementById("orgRejectConfirm")?.addEventListener("click", confirmReject);
document.getElementById("orgRejectModal")?.addEventListener("click", (event) => {
    if (event.target === event.currentTarget) closeOverlay("orgRejectModal");
});
document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    closeOverlay("orgRejectModal");
    closeOverlay("orgVerifySuccessModal");
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
    await loadOrganization();
});
