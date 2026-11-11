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
import {
    ORG_CLOUDINARY,
    cloudinaryUrlWithTransform,
    sanitizeCloudinaryDocumentUrl,
    candidateCloudinaryDocumentUrls,
} from "./cloudinary-upload.js";

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

function detailRow(iconClass, label, valueHtml) {
    return `
        <div class="org-detail-row org-detail-row--wide">
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

function formatBytes(bytes) {
    const size = Number(bytes) || 0;
    if (size <= 0) return "";
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatRegisteredAt(value) {
    if (!value) return "—";
    if (value?.toDate) {
        try {
            return escapeHtml(value.toDate().toLocaleString());
        } catch {
            return "—";
        }
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return showText(value);
    return escapeHtml(date.toLocaleString());
}

function normalizeLogoSrc(src) {
    let raw = String(src ?? "").trim();
    if (!raw) return "";
    if (raw.startsWith("//")) return `https:${raw}`;
    if (/^https?:\/\//i.test(raw)) return raw;
    if (/cloudinary\.com/i.test(raw)) return `https://${raw.replace(/^\/+/, "")}`;
    if (raw.startsWith("data:image/") || raw.startsWith("data:application/octet-stream")) {
        return raw;
    }
    // Raw base64 payload without a data-URL prefix
    if (raw.length > 64 && /^[A-Za-z0-9+/=\s]+$/.test(raw.slice(0, 200))) {
        return `data:image/jpeg;base64,${raw.replace(/\s+/g, "")}`;
    }
    return "";
}

function guessCloudinaryLogoUrl(id = orgId) {
    const uid = String(id || "").trim();
    const cloud = String(ORG_CLOUDINARY?.cloudName || "").trim();
    const folder = String(ORG_CLOUDINARY?.folder || "kalinga/organizations").trim();
    const avatarId = String(ORG_CLOUDINARY?.avatarPublicId || "avatar").trim();
    if (!uid || !cloud) return "";
    return `https://res.cloudinary.com/${cloud}/image/upload/${folder}/${uid}/${avatarId}`;
}

function resolveOrgLogoSrc(data, { forDownload = false } = {}) {
    const docs = data?.documents || {};
    const logoDoc = docs?.logo && typeof docs.logo === "object" ? docs.logo : null;

    // Prefer embedded/base64 first (always available offline), then remote URLs.
    const candidates = [
        data?.profilePictureBase64,
        logoDoc?.base64,
        logoDoc?.dataUrl,
        logoDoc?.dataURL,
        data?.profilePictureURL,
        data?.logoURL,
        data?.logoUrl,
        data?.photoURL,
        data?.avatarURL,
        data?.avatarUrl,
        logoDoc?.url,
        logoDoc?.secure_url,
        typeof docs?.logo === "string" ? docs.logo : "",
        typeof data?.logo === "string" ? data.logo : "",
        guessCloudinaryLogoUrl(orgId),
    ];

    for (const candidate of candidates) {
        const normalized = normalizeLogoSrc(candidate);
        if (!normalized) continue;
        if (
            !forDownload &&
            (/res\.cloudinary\.com/i.test(normalized) || /cloudinary\.com/i.test(normalized))
        ) {
            return cloudinaryUrlWithTransform(
                normalized,
                ORG_CLOUDINARY.avatarTransform
            );
        }
        return normalized;
    }
    return "";
}

function viewableDocUrl(rawUrl) {
    const normalized = normalizeLogoSrc(rawUrl);
    if (!normalized) return "";
    if (normalized.startsWith("data:") || normalized.startsWith("blob:")) {
        return normalized;
    }
    const cleaned = sanitizeCloudinaryDocumentUrl(normalized);
    const candidates = candidateCloudinaryDocumentUrls(cleaned);
    return (
        candidates.find((u) => u.includes("/raw/upload/")) ||
        candidates.find((u) => u.includes("/image/upload/")) ||
        candidates[0] ||
        cleaned ||
        normalized
    );
}

function isImageDoc(docItem, url = "") {
    const type = String(docItem?.type || "").toLowerCase();
    const name = String(docItem?.name || "").toLowerCase();
    const src = String(url || "").toLowerCase();
    if (type.startsWith("image/")) return true;
    if (/\.(png|jpe?g|gif|webp|bmp|svg)(?:$|\?)/i.test(name)) return true;
    if (src.startsWith("data:image/")) return true;
    if (/\/image\/upload\//i.test(src)) return true;
    if (/\.(png|jpe?g|gif|webp|bmp|svg)(?:$|\?)/i.test(src)) return true;
    return false;
}

function isOfficeDoc(nameOrUrl = "") {
    return /\.(docx?|xlsx?|pptx?)(?:$|\?)/i.test(String(nameOrUrl || ""));
}

function logoHtml(data) {
    const displaySrc = resolveOrgLogoSrc(data, { forDownload: false });
    const viewSrc = viewableDocUrl(
        resolveOrgLogoSrc(data, { forDownload: true }) || displaySrc
    );
    const previewSrc = displaySrc || viewSrc;
    const logoDoc =
        data?.documents?.logo && typeof data.documents.logo === "object"
            ? data.documents.logo
            : null;
    const fileName =
        String(logoDoc?.name || "").trim() ||
        (previewSrc ? "Organization logo" : "");
    const sizeLabel = formatBytes(logoDoc?.size);
    const sub = [logoDoc?.type, sizeLabel].filter(Boolean).join(" · ");

    if (!fileName && !previewSrc) return "—";

    if (previewSrc) {
        return `
        <span class="org-doc-meta org-doc-meta--logo">
            <a class="org-doc-view org-doc-view--image" href="${escapeHtml(viewSrc || previewSrc)}" data-view-name="${escapeHtml(fileName || "Organization logo")}" target="_blank" rel="noopener noreferrer">
              <img class="org-logo-preview" src="${escapeHtml(previewSrc)}" alt="${escapeHtml(fileName || "Organization logo")}" loading="lazy">
            </a>
            ${sub ? `<span class="org-doc-meta__sub">${escapeHtml(sub)}</span>` : `<span class="org-doc-meta__sub">Tap to view</span>`}
        </span>`;
    }

    return `<span class="org-doc-meta__name">${escapeHtml(fileName)}</span>`;
}

function documentMetaHtml(docItem) {
    if (!docItem || typeof docItem !== "object") return "—";
    const name = String(docItem.name || "").trim();
    const url = viewableDocUrl(
        docItem.url || docItem.secure_url || docItem.base64 || docItem.dataUrl || ""
    );
    const type = String(docItem.type || "").trim();
    const sizeLabel = formatBytes(docItem.size);
    const subParts = [type, sizeLabel].filter(Boolean);
    if (!name && !url) return "—";

    const title = name || "Document";

    if (url && isImageDoc(docItem, url)) {
        const previewSrc =
            /res\.cloudinary\.com/i.test(url) && !url.startsWith("data:")
                ? cloudinaryUrlWithTransform(url, "w_320,h_320,c_limit,q_auto,f_auto")
                : url;
        return `
        <span class="org-doc-meta org-doc-meta--logo">
            <a class="org-doc-view org-doc-view--image" href="${escapeHtml(url)}" data-view-name="${escapeHtml(title)}" target="_blank" rel="noopener noreferrer">
              <img class="org-logo-preview org-doc-image-preview" src="${escapeHtml(previewSrc)}" alt="${escapeHtml(title)}" loading="lazy">
            </a>
            <span class="org-doc-meta__name">${escapeHtml(title)}</span>
            <span class="org-doc-meta__sub">${escapeHtml([...(subParts.length ? subParts : []), "Tap to view"].join(" · "))}</span>
        </span>`;
    }

    let href = url;
    if (url && (isOfficeDoc(title) || isOfficeDoc(url))) {
        href = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(url)}`;
    }

    const titleHtml = href
        ? `<a class="org-doc-view" href="${escapeHtml(href)}" data-view-name="${escapeHtml(title)}" target="_blank" rel="noopener noreferrer">${escapeHtml(title)}</a>`
        : `<span class="org-doc-meta__name">${escapeHtml(title)}</span>`;
    if (href) subParts.push("Tap to view");

    return `
        <span class="org-doc-meta">
            ${titleHtml}
            ${subParts.length ? `<span class="org-doc-meta__sub">${escapeHtml(subParts.join(" · "))}</span>` : ""}
        </span>`;
}

function yesNo(value) {
    if (value === true) return "Yes";
    if (value === false) return "No";
    return "—";
}

function fieldsPanel(title, rowsHtml) {
    return `
        <div class="org-fields">
            <h3 class="org-detail-panel__title">${escapeHtml(title)}</h3>
            ${rowsHtml}
        </div>`;
}

function wireOrganizationTabs(root, initialTab = "organization") {
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
            const active = panel.getAttribute("data-org-panel") === key;
            panel.hidden = !active;
        });
    };

    tabs.forEach((tab) => {
        tab.addEventListener("click", () => {
            activate(tab.getAttribute("data-org-tab") || "organization");
        });
    });

    const hasInitial = tabs.some((tab) => tab.getAttribute("data-org-tab") === initialTab);
    activate(hasInitial ? initialTab : tabs[0].getAttribute("data-org-tab") || "organization");
}

function renderOrganization(data) {
    const statusKey = getOrgVerificationKey(data);
    const statusLabel = getOrgVerificationLabel(data).toUpperCase();
    const rep = data.representative || {};
    const docs = data.documents || {};
    const name = data.name || data.orgName || "";
    const address = data.completeAddress || data.address || "";
    const hasReview = Boolean(String(data.rejectionReason || "").trim());

    const organizationRows = [
        detailRow("fa-image", "Organization Logo:", logoHtml(data)),
        detailRow("fa-building", "Organization Name:", showText(name)),
        detailRow("fa-tag", "Organization Type:", showText(data.orgType)),
        detailRow("fa-align-left", "Organization Description:", showText(data.orgDescription)),
        detailRow("fa-calendar", "Year Established:", showText(data.yearEstablished)),
        detailRow("fa-link", "Official Website / Social Media:", websiteHtml(data.orgWebsite, data.orgWebsites)),
        detailRow("fa-envelope", "Organization Email:", joinedList(data.orgEmail, data.orgEmails)),
        detailRow(
            "fa-phone",
            "Contact Number:",
            joinedList(data.orgContactNumber || data.phone, data.orgContactNumbers)
        ),
        detailRow("fa-map-marker-alt", "Complete Address:", showText(address)),
        detailRow("fa-earth-asia", "Organization Scope:", showText(data.orgScope)),
        detailRow(
            "fa-check-circle",
            "Status:",
            `<span class="org-status-badge ${escapeHtml(statusKey)}">${escapeHtml(statusLabel)}</span>`
        ),
        detailRow("fa-fingerprint", "Org ID:", showText(orgId)),
        detailRow("fa-clock", "Registered At:", formatRegisteredAt(data.createdAt)),
    ].join("");

    const representativeRows = [
        detailRow("fa-user", "Full Name:", showText(rep.fullName)),
        detailRow("fa-id-badge", "Position / Designation:", showText(rep.position)),
        detailRow("fa-envelope", "Email Address:", showText(rep.email)),
        detailRow("fa-phone", "Contact Number:", showText(rep.contactNumber)),
        detailRow("fa-id-card", "Government-issued ID Type:", showText(rep.govIdType)),
        detailRow("fa-hashtag", "ID Number:", showText(rep.govIdNumber)),
        detailRow("fa-id-card", "ID Front Side:", documentMetaHtml(docs.govIdFront)),
        detailRow("fa-id-card", "ID Back Side:", documentMetaHtml(docs.govIdBack)),
        detailRow("fa-file-signature", "Proof of Authorization:", documentMetaHtml(docs.authorization)),
    ].join("");

    const emergency = data.emergency || {};
    const emergencyLat =
        emergency.latitude != null ? Number(emergency.latitude) : null;
    const emergencyLng =
        emergency.longitude != null ? Number(emergency.longitude) : null;
    const emergencyCoords =
        Number.isFinite(emergencyLat) && Number.isFinite(emergencyLng)
            ? `${emergencyLat.toFixed(5)}, ${emergencyLng.toFixed(5)}`
            : "";
    const emergencyRows = [
        detailRow("fa-user-shield", "Name:", showText(emergency.name || data.emergencyName)),
        detailRow("fa-phone", "Number:", showText(emergency.number || data.emergencyNumber)),
        detailRow(
            "fa-map-marker-alt",
            "Location:",
            showText(emergency.location || data.emergencyLocation)
        ),
        emergencyCoords
            ? detailRow("fa-globe", "Coordinates:", showText(emergencyCoords))
            : "",
    ]
        .filter(Boolean)
        .join("");

    const documentsRows = [
        detailRow(
            "fa-file-contract",
            "Certificate of Registration / Legal Recognition:",
            documentMetaHtml(docs.registration)
        ),
        detailRow(
            "fa-file-alt",
            "Proof of Official Address:",
            documentMetaHtml(docs.addressProof)
        ),
        detailRow(
            "fa-folder-open",
            "Additional document for organization type:",
            documentMetaHtml(docs.typeSpecific)
        ),
    ].join("");

    const accountRows = [
        detailRow("fa-user-tag", "Username:", showText(data.username)),
        detailRow("fa-envelope", "Sign-in Email:", showText(data.email)),
        detailRow("fa-check-double", "Terms Accepted:", showText(yesNo(data.acceptedTerms))),
    ].join("");

    const reviewReasonLabel =
        statusKey === "deactivated" ? "Deactivation reason:" : "Rejection reason:";
    const reviewRows = hasReview
        ? detailRow("fa-comment-alt", reviewReasonLabel, showText(data.rejectionReason))
        : "";

    const tabsHtml = `
        <div class="org-detail-tabs" role="tablist" aria-label="Organization registration sections">
            <button type="button" class="org-detail-tab active" role="tab" aria-selected="true" data-org-tab="organization">A. Organization</button>
            <button type="button" class="org-detail-tab" role="tab" aria-selected="false" data-org-tab="representative">B. Representative</button>
            <button type="button" class="org-detail-tab" role="tab" aria-selected="false" data-org-tab="emergency">Emergency</button>
            <button type="button" class="org-detail-tab" role="tab" aria-selected="false" data-org-tab="documents">Documents</button>
            <button type="button" class="org-detail-tab" role="tab" aria-selected="false" data-org-tab="account">C. Account</button>
            ${
                hasReview
                    ? `<button type="button" class="org-detail-tab" role="tab" aria-selected="false" data-org-tab="review">Review</button>`
                    : ""
            }
        </div>`;

    const panelsHtml = `
        <section class="org-detail-panel" data-org-panel="organization" role="tabpanel">
            ${fieldsPanel("A. Organization Information", organizationRows)}
        </section>
        <section class="org-detail-panel" data-org-panel="representative" role="tabpanel" hidden>
            ${fieldsPanel("B. Authorized Representative", representativeRows)}
        </section>
        <section class="org-detail-panel" data-org-panel="emergency" role="tabpanel" hidden>
            ${fieldsPanel("Emergency Profiling", emergencyRows)}
        </section>
        <section class="org-detail-panel" data-org-panel="documents" role="tabpanel" hidden>
            ${fieldsPanel("Supporting Documents", documentsRows)}
        </section>
        <section class="org-detail-panel" data-org-panel="account" role="tabpanel" hidden>
            ${fieldsPanel("C. Account Credentials", accountRows)}
        </section>
        ${
            hasReview
                ? `<section class="org-detail-panel" data-org-panel="review" role="tabpanel" hidden>
                    ${fieldsPanel("Review", reviewRows)}
                   </section>`
                : ""
        }`;

    const body = document.getElementById("orgPageBody");
    const status = document.getElementById("orgPageStatus");
    const footer = document.getElementById("orgPageFooter");
    const actions = document.getElementById("orgPageActions");
    if (body) {
        body.hidden = false;
        body.innerHTML = `${tabsHtml}${panelsHtml}`;
        wireOrganizationTabs(body, "organization");
    }
    if (status) status.hidden = true;
    if (footer) footer.hidden = false;

    if (actions) {
        const verifyBtn =
            statusKey !== "verified"
                ? `<button type="button" class="org-action org-action--verify" id="orgVerifyBtn"><i class="fas fa-check"></i> Verify organization</button>`
                : "";
        const rejectOrDeactivateBtn =
            statusKey === "pending"
                ? `<button type="button" class="org-action org-action--reject" id="orgRejectBtn" data-org-action="reject"><i class="fas fa-times"></i> Reject</button>`
                : statusKey === "verified"
                  ? `<button type="button" class="org-action org-action--reject" id="orgRejectBtn" data-org-action="deactivate"><i class="fas fa-ban"></i> Deactivate</button>`
                  : "";
        actions.innerHTML = `${rejectOrDeactivateBtn}${verifyBtn}`;
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
            previouslyVerified: true,
            rejectedAt: deleteField(),
            rejectionReason: deleteField(),
        });
        return;
    }

    if (
        status === ORG_VERIFICATION_STATUS.REJECTED ||
        status === ORG_VERIFICATION_STATUS.DEACTIVATED
    ) {
        const reason = String(rejectionReason || "").trim();
        await updateDoc(ref, {
            verified: false,
            verificationStatus: status,
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

let orgActionMode = "reject";

function syncOrgRejectModalCopy(mode = "reject") {
    const isDeactivate = mode === "deactivate";
    const title = document.getElementById("orgRejectModalTitle");
    const help = document.getElementById("orgRejectModalHelp");
    const confirm = document.getElementById("orgRejectConfirm");
    const reasonInput = document.getElementById("orgRejectReasonInput");

    if (title) {
        title.textContent = isDeactivate
            ? "Deactivate organization"
            : "Reject organization";
    }
    if (help) {
        help.textContent = isDeactivate
            ? "Deactivate this verified organization? They will not be able to sign in until an administrator verifies them again."
            : "Reject this organization registration? They will not be able to sign in until an administrator approves them again.";
    }
    if (confirm) {
        confirm.textContent = isDeactivate
            ? "Deactivate organization"
            : "Reject organization";
    }
    if (reasonInput) {
        reasonInput.placeholder = isDeactivate
            ? "e.g. Policy violation, inactive account…"
            : "e.g. Incomplete registration details…";
    }
}

function openRejectModal(event) {
    const button = event?.currentTarget;
    orgActionMode =
        button?.getAttribute("data-org-action") === "deactivate"
            ? "deactivate"
            : "reject";
    syncOrgRejectModalCopy(orgActionMode);
    const textarea = document.getElementById("orgRejectReasonInput");
    if (textarea) textarea.value = "";
    openOverlay("orgRejectModal");
    textarea?.focus();
}

async function confirmReject() {
    const textarea = document.getElementById("orgRejectReasonInput");
    const reason = textarea?.value || "";
    const mode = orgActionMode;
    closeOverlay("orgRejectModal");
    syncOrgRejectModalCopy("reject");
    orgActionMode = "reject";
    try {
        await setOrganizationVerification(
            mode === "deactivate"
                ? ORG_VERIFICATION_STATUS.DEACTIVATED
                : ORG_VERIFICATION_STATUS.REJECTED,
            reason
        );
        await loadOrganization();
    } catch (error) {
        console.error(error);
        alert(
            mode === "deactivate"
                ? "Could not deactivate organization. Please try again."
                : "Could not reject organization. Please try again."
        );
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
function closeRejectModal() {
    closeOverlay("orgRejectModal");
    orgActionMode = "reject";
    syncOrgRejectModalCopy("reject");
}

document.getElementById("orgRejectCancel")?.addEventListener("click", closeRejectModal);
document.getElementById("orgRejectConfirm")?.addEventListener("click", confirmReject);
document.getElementById("orgRejectModal")?.addEventListener("click", (event) => {
    if (event.target === event.currentTarget) closeRejectModal();
});
document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    closeRejectModal();
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
