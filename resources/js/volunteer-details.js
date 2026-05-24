import { auth, db } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    where,
} from "firebase/firestore";
import {
    STORAGE_MISSIONS_SUB,
    STORAGE_USERS_SUB,
    inferMissionIdForOrg,
    applicationBelongsToOrg,
} from "./application-storage.js";

let applicantUserId = null;
let orgMissionById = new Map();
let historyMissionIds = new Set();
let applicantApplications = [];

function getUserIdFromUrl() {
    return new URLSearchParams(window.location.search).get("userId");
}

function escapeHtml(text) {
    const s = String(text ?? "");
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function formatMissionDate(mission) {
    if (!mission) return "—";
    const raw = mission.date || mission.endDate;
    if (!raw) return "—";
    if (typeof raw === "string" && raw.trim()) return raw.trim();
    let d;
    if (typeof raw.toDate === "function") d = raw.toDate();
    else if (raw.seconds != null) d = new Date(raw.seconds * 1000);
    else d = new Date(raw);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

function truncateDescription(text, maxLen = 160) {
    const s = String(text ?? "").trim();
    if (!s) return "—";
    if (s.length <= maxLen) return s;
    return `${s.slice(0, maxLen)}…`;
}

function isApprovedStatus(status) {
    const s = (status || "").toLowerCase();
    return s === "approved" || s === "accepted";
}

/** Mission is finished: in org history, marked completed, or moved to history. */
function isMissionCompleted(missionId) {
    if (historyMissionIds.has(missionId)) return true;
    const mission = orgMissionById.get(missionId);
    if (!mission) return false;
    const st = (mission.status || "").toLowerCase();
    return st === "completed" || mission.movedToHistoryAt != null;
}

function getAttendedMissions() {
    return applicantApplications
        .filter(
            (a) =>
                isApprovedStatus(a.status) && isMissionCompleted(a.missionId)
        )
        .map((a) => {
            const mission = orgMissionById.get(a.missionId) || {};
            return {
                ...a,
                missionName:
                    a.missionName ||
                    mission.missionName ||
                    mission.name ||
                    "Mission",
                missionDate: formatMissionDate(mission),
                missionDescription: mission.description || "",
                sortDate: mission.date || mission.endDate || "",
            };
        })
        .sort((a, b) =>
            String(b.sortDate || "").localeCompare(String(a.sortDate || ""))
        );
}

async function buildOrgMissionMap(orgId) {
    const map = new Map();
    historyMissionIds = new Set();

    const addMission = (id, data, inHistory = false) => {
        map.set(id, {
            ...data,
            missionName: data.missionName || data.name || data.title || "Mission",
            orgId: data.orgId || data.organizationId || orgId,
        });
        if (inHistory) historyMissionIds.add(id);
    };

    const [orgMissionsResult, historyResult] = await Promise.allSettled([
        getDocs(collection(db, "organizations", orgId, "missions")),
        getDocs(collection(db, "organizations", orgId, "history")),
    ]);

    if (orgMissionsResult.status === "fulfilled") {
        orgMissionsResult.value.docs.forEach((missionDoc) => {
            addMission(missionDoc.id, missionDoc.data());
        });
    } else {
        console.warn("[WARN] organizations/missions:", orgMissionsResult.reason);
    }

    if (historyResult.status === "fulfilled") {
        historyResult.value.docs.forEach((missionDoc) => {
            addMission(missionDoc.id, missionDoc.data(), true);
        });
    } else {
        console.warn("[WARN] organizations/history:", historyResult.reason);
    }

    return map;
}

function buildApplicationRecord(
    docSnap,
    data,
    missionId,
    mission,
    storage,
    userId,
    orgId
) {
    return {
        orgId: orgId || data.orgId || data.organizationId || mission?.orgId || "",
        id: docSnap.id,
        userApplicationId: data.userApplicationId || "",
        storage,
        userId: data.userId || userId,
        name: data.displayName || data.name || "",
        email: data.email || "",
        phone: data.mobileNumber || data.phone || data.mobile || "",
        occupation: data.occupation || "",
        status: data.status || "pending",
        missionId,
        missionName: data.missionName || mission?.missionName || mission?.name || "Mission",
    };
}

async function loadApplicantApplications(orgId, userId) {
    const byMission = new Map();

    const mergeApp = (missionId, record) => {
        if (!missionId || !orgMissionById.has(missionId)) return;
        const existing = byMission.get(missionId);
        if (!existing) {
            byMission.set(missionId, record);
            return;
        }
        const existingApproved = isApprovedStatus(existing.status);
        const incomingApproved = isApprovedStatus(record.status);
        if (incomingApproved && !existingApproved) {
            byMission.set(missionId, record);
            return;
        }
        if (
            incomingApproved === existingApproved &&
            record.storage === STORAGE_MISSIONS_SUB
        ) {
            byMission.set(missionId, record);
        }
    };

    try {
        const userAppsSnap = await getDocs(
            collection(db, "users", userId, "applications")
        );
        for (const docSnap of userAppsSnap.docs) {
            const data = docSnap.data();
            const missionId = inferMissionIdForOrg(
                data,
                orgMissionById,
                docSnap.ref.path,
                orgId
            );
            if (
                !missionId ||
                !applicationBelongsToOrg(
                    data,
                    missionId,
                    orgMissionById,
                    orgId,
                    docSnap.ref.path
                )
            ) {
                continue;
            }
            const mission = orgMissionById.get(missionId);
            mergeApp(
                missionId,
                buildApplicationRecord(
                    docSnap,
                    { ...data, userApplicationId: docSnap.id },
                    missionId,
                    mission,
                    STORAGE_USERS_SUB,
                    userId,
                    orgId
                )
            );
        }
    } catch (err) {
        console.warn("[WARN] users applications:", err);
    }

    return Array.from(byMission.values());
}

/** Org roster is the primary source on the volunteers list; merge it for the detail page. */
async function mergeApplicantFromOrgRosters(orgId, userId) {
    const byMission = new Map();
    for (const app of applicantApplications) {
        byMission.set(app.missionId, app);
    }

    const missionIdsToCheck = [...orgMissionById.keys()].filter((missionId) =>
        isMissionCompleted(missionId)
    );

    await Promise.all(
        missionIdsToCheck.map(async (missionId) => {
            const mission = orgMissionById.get(missionId);
            try {
                const rosterRef = doc(
                    db,
                    "organizations",
                    orgId,
                    "missions",
                    missionId,
                    "volunteers",
                    userId
                );
                const rosterSnap = await getDoc(rosterRef);
                let rosterData = rosterSnap.exists() ? rosterSnap.data() : null;

                if (!rosterData) {
                    const rosterQuery = await getDocs(
                        query(
                            collection(
                                db,
                                "organizations",
                                orgId,
                                "missions",
                                missionId,
                                "volunteers"
                            ),
                            where("userId", "==", userId)
                        )
                    );
                    if (!rosterQuery.empty) {
                        rosterData = rosterQuery.docs[0].data();
                    }
                }

                if (!rosterData) return;

                const rosterStatus = (rosterData.status || "approved").toLowerCase();
                if (!isApprovedStatus(rosterStatus)) return;

                const existing = byMission.get(missionId);
                const record = {
                    orgId,
                    id: existing?.id || rosterData.applicationId || "",
                    userApplicationId:
                        existing?.userApplicationId ||
                        rosterData.userApplicationId ||
                        "",
                    storage: existing?.storage || STORAGE_MISSIONS_SUB,
                    userId,
                    name:
                        existing?.name ||
                        rosterData.displayName ||
                        rosterData.name ||
                        "",
                    email: existing?.email || rosterData.email || "",
                    phone:
                        existing?.phone ||
                        rosterData.mobileNumber ||
                        rosterData.phone ||
                        "",
                    occupation: existing?.occupation || rosterData.occupation || "",
                    status: "approved",
                    missionId,
                    missionName:
                        rosterData.missionName ||
                        existing?.missionName ||
                        mission.missionName ||
                        mission.name ||
                        "Mission",
                };

                if (
                    !existing ||
                    !isApprovedStatus(existing.status) ||
                    record.storage === STORAGE_MISSIONS_SUB
                ) {
                    byMission.set(missionId, record);
                }
            } catch (err) {
                console.warn(
                    "[WARN] roster",
                    orgId,
                    missionId,
                    userId,
                    err
                );
            }
        })
    );

    applicantApplications = Array.from(byMission.values());
}

function initialsFromName(name) {
    const parts = String(name || "")
        .trim()
        .split(/\s+/)
        .filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function renderProfile(profile) {
    const nameEl = document.getElementById("applicantName");
    const emailEl = document.getElementById("applicantEmail");
    const phoneEl = document.getElementById("applicantPhone");
    const avatarWrap = document.getElementById("applicantAvatarWrap");
    const avatarImg = document.getElementById("applicantAvatarImg");
    const avatarInitial = document.getElementById("applicantAvatarInitial");
    if (!nameEl || !emailEl || !phoneEl) return;

    const first = applicantApplications[0];
    const profileName =
        profile?.name ||
        first?.name ||
        nameEl.dataset?.fallback ||
        "Volunteer";
    const email = profile?.email || first?.email || "—";
    const phone = profile?.phone || first?.phone || "—";
    const photoUrl = profile?.photoUrl || "";

    nameEl.textContent = profileName;
    emailEl.textContent = email || "—";
    phoneEl.textContent = phone || "—";

    if (avatarInitial) {
        avatarInitial.textContent = initialsFromName(profileName);
    }

    if (avatarWrap && avatarImg) {
        avatarImg.onerror = () => {
            console.warn("[WARN] Failed to load photoUrl image");
            avatarImg.removeAttribute("src");
            avatarImg.setAttribute("hidden", "");
            avatarWrap.classList.remove("has-photo");
        };

        if (photoUrl) {
            avatarImg.removeAttribute("crossorigin");
            avatarImg.removeAttribute("referrerpolicy");
            avatarImg.src = photoUrl;
            avatarImg.removeAttribute("hidden");
            avatarWrap.classList.add("has-photo");
        } else {
            avatarImg.removeAttribute("src");
            avatarImg.setAttribute("hidden", "");
            avatarWrap.classList.remove("has-photo");
        }
    }
}

function renderAttendedMissionsTable() {
    const tbody = document.getElementById("applicantMissionsBody");
    const countEl = document.getElementById("missionCountText");
    if (!tbody) return;

    const attended = getAttendedMissions();

    if (countEl) {
        countEl.textContent =
            attended.length === 1
                ? "1 mission"
                : `${attended.length} missions`;
    }

    if (attended.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted">No completed missions attended yet</td></tr>`;
        return;
    }

    tbody.innerHTML = attended
        .map((v) => {
            const missionLink = `/missions/details?id=${encodeURIComponent(v.missionId)}`;
            const desc = truncateDescription(v.missionDescription);
            const fullDesc = (v.missionDescription || "").trim();

            return `
                <tr>
                    <td>
                        <a href="${missionLink}" class="mission-link">${escapeHtml(v.missionName)}</a>
                    </td>
                    <td>${escapeHtml(v.missionDate)}</td>
                    <td class="mission-desc-cell" ${fullDesc ? `title="${escapeHtml(fullDesc)}"` : ""}>${escapeHtml(desc)}</td>
                </tr>`;
        })
        .join("");
}

/** photoUrl from users/{id} — Cloudinary (or any https) URL used as-is after normalize. */
function normalizephotoUrl(photoUrl) {
    let raw = String(photoUrl ?? "").trim();
    if (!raw) return "";

    // Protocol-relative Cloudinary URLs: //res.cloudinary.com/...
    if (raw.startsWith("//")) {
        return `https:${raw}`;
    }

    if (/^https?:\/\//i.test(raw)) {
        return raw;
    }

    // Stored without protocol, e.g. res.cloudinary.com/...
    if (/cloudinary\.com/i.test(raw)) {
        return `https://${raw.replace(/^\/+/, "")}`;
    }

    return raw;
}

async function loadApplicantProfile(userId) {
    try {
        const snap = await getDoc(doc(db, "users", userId));
        if (!snap.exists()) {
            console.warn("[WARN] users/", userId, "not found");
            return null;
        }
        const u = snap.data();
        const photoUrl = normalizephotoUrl(u.photoUrl);

        return {
            name: u.name || u.displayName || "Volunteer",
            email: u.email || "",
            phone: u.phone || u.mobileNumber || u.mobile || "",
            occupation: u.occupation || "",
            photoUrl,
        };
    } catch (err) {
        console.error("[ERROR] loadApplicantProfile:", err);
        return null;
    }
}

function setDetailLoadingVisible(visible, message = "Loading volunteer…") {
    const loading = document.getElementById("detailLoading");
    const content = document.getElementById("detailContent");
    if (loading) {
        if (visible) {
            loading.hidden = false;
            loading.removeAttribute("hidden");
            loading.innerHTML = `
                <div class="detail-loading-inner">
                    <div class="detail-loading-spinner" aria-hidden="true"></div>
                    <span>${escapeHtml(message)}</span>
                </div>`;
        } else {
            loading.hidden = true;
            loading.setAttribute("hidden", "");
            loading.innerHTML = "";
        }
    }
    if (content) {
        if (visible) {
            content.hidden = true;
            content.setAttribute("hidden", "");
        } else {
            content.hidden = false;
            content.removeAttribute("hidden");
        }
    }
}

async function initPage(user) {
    applicantUserId = getUserIdFromUrl();
    if (!applicantUserId) {
        window.location.href = "/organization/volunteers";
        return;
    }

    setDetailLoadingVisible(true);

    try {
        const [profile, missionMap] = await Promise.all([
            loadApplicantProfile(applicantUserId),
            buildOrgMissionMap(user.uid),
        ]);

        orgMissionById = missionMap;

        applicantApplications = await loadApplicantApplications(
            user.uid,
            applicantUserId
        );
        await mergeApplicantFromOrgRosters(user.uid, applicantUserId);

        const nameEl = document.getElementById("applicantName");
        if (nameEl && profile?.name) {
            nameEl.dataset.fallback = profile.name;
        }

        if (profile && applicantApplications.length > 0) {
            applicantApplications[0].name =
                applicantApplications[0].name || profile.name;
            applicantApplications[0].email =
                applicantApplications[0].email || profile.email;
            applicantApplications[0].phone =
                applicantApplications[0].phone || profile.phone;
            applicantApplications[0].occupation =
                applicantApplications[0].occupation || profile.occupation;
        }

        renderProfile(profile);
        renderAttendedMissionsTable();
    } catch (err) {
        console.error("[ERROR] initPage:", err);
        const loading = document.getElementById("detailLoading");
        if (loading) {
            loading.hidden = false;
            loading.removeAttribute("hidden");
            loading.innerHTML =
                '<p class="detail-loading-error">Could not load volunteer details. Please refresh the page.</p>';
        }
        const content = document.getElementById("detailContent");
        if (content) {
            content.hidden = true;
            content.setAttribute("hidden", "");
        }
        return;
    }

    setDetailLoadingVisible(false);
}

document.addEventListener("DOMContentLoaded", () => {
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = "/organization/login";
            return;
        }
        await initPage(user);
    });
});
