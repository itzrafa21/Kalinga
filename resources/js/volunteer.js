import { auth, db } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, query, doc, updateDoc, getDoc } from "firebase/firestore";

const STORAGE_MISSIONS_SUB = "missions_sub";
const STORAGE_APPLICATIONS_ROOT = "applications_root";

async function fetchUserFieldsForVolunteer(userId) {
    if (!userId) return {};
    try {
        const snap = await getDoc(doc(db, "users", userId));
        if (!snap.exists()) return {};
        const u = snap.data();
        return {
            name: u.name || u.displayName || "",
            email: u.email || "",
            phone: u.phone || u.mobileNumber || u.mobile || "",
            occupation: u.occupation || "",
        };
    } catch (e) {
        console.warn("[WARNING] Could not load users/", userId, e);
        return {};
    }
}

function escapeHtml(text) {
    const s = String(text ?? "");
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

// Elements
const volunteerTable = document.getElementById("volunteerTableBody");
const searchInput = document.getElementById("searchInput");
const filterSelect = document.getElementById("filterSelect");
const modalBody = document.getElementById("modalBody");

let allVolunteers = [];
let allMissions = [];
let currentUser = null;

let rejectModalContext = { applicationId: null, missionId: null };

function openRejectModal(applicationId, missionId) {
    rejectModalContext = { applicationId, missionId };
    const overlay = document.getElementById("rejectReasonModal");
    const textarea = document.getElementById("rejectReasonInput");
    const err = document.getElementById("rejectReasonError");
    if (!overlay || !textarea) return;
    textarea.value = "";
    if (err) err.textContent = "";
    overlay.removeAttribute("hidden");
    overlay.classList.add("is-open");
    textarea.focus();
}

function closeRejectModal() {
    const overlay = document.getElementById("rejectReasonModal");
    if (!overlay) return;
    overlay.setAttribute("hidden", "");
    overlay.classList.remove("is-open");
    rejectModalContext = { applicationId: null, missionId: null };
}

function confirmRejectFromModal() {
    const textarea = document.getElementById("rejectReasonInput");
    const err = document.getElementById("rejectReasonError");
    const trimmed = (textarea?.value || "").trim();
    if (!trimmed) {
        if (err) err.textContent = "A rejection reason is required.";
        textarea?.focus();
        return;
    }
    if (err) err.textContent = "";
    const { applicationId, missionId } = rejectModalContext;
    if (!applicationId || !missionId) return;
    closeRejectModal();
    updateApplicationStatus(applicationId, missionId, "rejected", {
        rejectionReason: trimmed,
    });
}

(function initRejectReasonModal() {
    const overlay = document.getElementById("rejectReasonModal");
    if (!overlay) return;
    document.getElementById("rejectModalCancel")?.addEventListener("click", closeRejectModal);
    document.getElementById("rejectModalConfirm")?.addEventListener("click", confirmRejectFromModal);
    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) closeRejectModal();
    });
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && overlay.classList.contains("is-open")) closeRejectModal();
    });
})();

async function loadSidebarUser(user) {
    try {
        const orgSnap = await getDoc(doc(db, "organizations", user.uid));
        const data = orgSnap.exists() ? orgSnap.data() : {};

        const displayName =
            (data.name && String(data.name).trim()) ||
            (data.orgName && String(data.orgName).trim()) ||
            user.displayName ||
            user.email ||
            "Organization";

        const sidebarNameEl = document.getElementById("sidebarUserName");
        const sidebarInitialEl = document.getElementById("sidebarUserInitial");
        const avatarWrap = document.querySelector(".sidebar-user-avatar");
        const avatarImg = document.getElementById("sidebarUserAvatarImg");

        if (sidebarNameEl) sidebarNameEl.textContent = displayName;
        if (sidebarInitialEl) {
            const ch = String(displayName).trim().charAt(0);
            sidebarInitialEl.textContent = ch ? ch.toUpperCase() : "?";
        }

        if (avatarWrap && avatarImg) {
            const pic = data.profilePictureBase64 || data.profilePictureURL || "";
            if (pic) {
                avatarImg.src = pic;
                avatarWrap.classList.add("has-photo");
            } else {
                avatarImg.removeAttribute("src");
                avatarWrap.classList.remove("has-photo");
            }
        }
    } catch (err) {
        console.error("[ERROR] loadSidebarUser:", err);
    }
}
// Wait for authentication
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        console.log("[WARNING] No user authenticated, redirecting to login");
        window.location.href = "/organization/login";
        return;
    }
    
    currentUser = user;
    await loadSidebarUser(user);
    console.log("[SUCCESS] Logged in as:", user.uid);
    console.log("[SUCCESS] User email:", user.email);
    
    // Load missions and volunteers
    await loadMissions(user.uid);
    await loadVolunteers();
});

// Function to load missions for the dropdown
async function loadMissions(user) {
    console.log("[INFO] Loading missions for user:", user);
    
    try {
        // Clear existing options
        filterSelect.innerHTML = '<option value="">All Missions</option>';
        
        // Load missions from main missions collection, filtered by orgId
        const missionsRef = collection(db, "missions");
        const missionsQuery = query(missionsRef);
        const snapshot = await getDocs(missionsQuery);
        
        console.log("[INFO] Total missions found:", snapshot.size);
        
        if (snapshot.empty) {
            console.log("[WARNING] No missions found!");
            return;
        }
        
        snapshot.forEach((docSnap) => {
            const mission = docSnap.data();
            console.log("[INFO] Mission data:", mission);
            
            // Only show missions that belong to this organization
            if (mission.orgId === user.uid) {
                const option = document.createElement("option");
                option.value = docSnap.id;
                option.textContent = mission.missionName || mission.name || "Untitled Mission";
                filterSelect.appendChild(option);
                
                console.log("[SUCCESS] Added mission to dropdown:", option.textContent);
            } else {
                console.log("[WARNING] Mission doesn't belong to this org:", mission.orgId, "vs", user.uid);
            }
        });
        
        // Store ALL missions for volunteer loading
        allMissions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        console.log("[SUCCESS] Loaded missions:", allMissions.length);
        
    } catch (error) {
        console.error("[ERROR] Error loading missions:", error);
    }
}

// Function to load volunteers
async function loadVolunteers() {
    try {
        console.log("[INFO] Loading volunteers: missions/{id}/applications + root applications");
        allVolunteers = [];

        const missionsSnapshot = await getDocs(collection(db, "missions"));
        const orgMissionById = new Map();
        missionsSnapshot.docs.forEach((missionDoc) => {
            const mission = missionDoc.data();
            if (mission.orgId === currentUser.uid) {
                orgMissionById.set(missionDoc.id, mission);
            }
        });

        for (const [missionId, mission] of orgMissionById) {
            try {
                const applicationsSnapshot = await getDocs(
                    collection(db, "missions", missionId, "applications")
                );
                applicationsSnapshot.forEach((docSnap) => {
                    const application = docSnap.data();
                    allVolunteers.push({
                        id: docSnap.id,
                        storage: STORAGE_MISSIONS_SUB,
                        name: application.displayName || application.name || "N/A",
                        email: application.email || "N/A",
                        phone: application.mobileNumber || application.phone || application.mobile || "N/A",
                        occupation: application.occupation || "N/A",
                        status: application.status || "pending",
                        appliedAt: application.appliedAt,
                        missionId,
                        missionName: mission.missionName || mission.name,
                        userId: application.userId,
                        rejectionReason: application.rejectionReason || "",
                    });
                });
            } catch (missionError) {
                console.error("[ERROR] subcollection applications", missionId, missionError);
            }
        }

        const rootAppsSnap = await getDocs(collection(db, "applications"));
        const dedupe = new Set(
            allVolunteers.filter((v) => v.userId).map((v) => `${v.missionId}_${v.userId}`)
        );

        for (const docSnap of rootAppsSnap.docs) {
            const application = docSnap.data();
            const missionId = application.missionId;
            if (!missionId || !orgMissionById.has(missionId)) continue;

            const mission = orgMissionById.get(missionId);
            const userId = application.userId || "";
            const key = userId ? `${missionId}_${userId}` : null;
            if (key && dedupe.has(key)) continue;
            if (key) dedupe.add(key);

            const profile = await fetchUserFieldsForVolunteer(userId);
            allVolunteers.push({
                id: docSnap.id,
                storage: STORAGE_APPLICATIONS_ROOT,
                name:
                    profile.name ||
                    application.displayName ||
                    application.name ||
                    (userId ? `User ${userId.slice(0, 8)}…` : "N/A"),
                email: profile.email || application.email || "N/A",
                phone: profile.phone || application.mobileNumber || application.phone || application.mobile || "N/A",
                occupation: profile.occupation || application.occupation || "N/A",
                status: application.status || "pending",
                appliedAt: application.appliedAt || application.createdAt,
                missionId,
                missionName: mission.missionName || mission.name,
                userId,
                rejectionReason: application.rejectionReason || "",
            });
        }

        console.log("[SUCCESS] Total volunteers loaded:", allVolunteers.length);
        displayVolunteers(allVolunteers);
        updateVolunteerCounts(allVolunteers);
    } catch (error) {
        console.error("Error loading volunteers:", error);
    }
}

// Update volunteer summary cards using correct IDs
function updateVolunteerCounts(volunteers) {
    console.log("[INFO] Updating volunteer counts for:", volunteers.length, "volunteers");
    
    // Count volunteers by status
    const totalVolunteers = volunteers.length;
    const pendingVolunteers = volunteers.filter(v => (v.status || '').toLowerCase() === 'pending').length;
    const approvedVolunteers = volunteers.filter(v => (v.status || '').toLowerCase() === 'approved').length;
    
    console.log("[INFO] Counts - Total:", totalVolunteers, "Pending:", pendingVolunteers, "Approved:", approvedVolunteers);
    
    // Use the correct IDs from the HTML
    const totalElement = document.getElementById("totalVolunteers");
    const pendingElement = document.getElementById("pendingVolunteers");
    const approvedElement = document.getElementById("approvedVolunteers");
    
    if (totalElement) {
        totalElement.textContent = totalVolunteers;
        console.log("[SUCCESS] Updated total volunteers:", totalVolunteers);
    } else {
        console.log("[ERROR] Could not find totalVolunteers element");
    }
    
    if (pendingElement) {
        pendingElement.textContent = pendingVolunteers;
        console.log("[SUCCESS] Updated pending volunteers:", pendingVolunteers);
    } else {
        console.log("[ERROR] Could not find pendingVolunteers element");
    }
    
    if (approvedElement) {
        approvedElement.textContent = approvedVolunteers;
        console.log("[SUCCESS] Updated approved volunteers:", approvedVolunteers);
    } else {
        console.log("[ERROR] Could not find approvedVolunteers element");
    }
}

async function updateApplicationStatus(applicationId, missionId, newStatus, options = {}) {
    try {
        const rejectionReason = (options.rejectionReason || "").trim();
        console.log(`[INFO] Updating application ${applicationId} status to: ${newStatus}`);

        const volunteer = allVolunteers.find(
            (v) => v.id === applicationId && v.missionId === missionId
        );
        const storage = volunteer?.storage || STORAGE_MISSIONS_SUB;

        const applicationRef =
            storage === STORAGE_APPLICATIONS_ROOT
                ? doc(db, "applications", applicationId)
                : doc(db, "missions", missionId, "applications", applicationId);

        const payload = {
            status: newStatus,
            updatedAt: new Date(),
        };

        if (newStatus === "rejected") {
            payload.rejectionReason = rejectionReason;
            payload.rejectedAt = new Date();
        }

        await updateDoc(applicationRef, payload);

        if (volunteer) {
            volunteer.status = newStatus;
            if (newStatus === "rejected") {
                volunteer.rejectionReason = rejectionReason;
            }
        }

        displayVolunteers(allVolunteers);
        updateVolunteerCounts(allVolunteers);

        alert(`[SUCCESS] Volunteer application ${newStatus} successfully!`);
    } catch (error) {
        console.error("[ERROR] Error updating application status:", error);
        alert(`[ERROR] Failed to ${newStatus} application. Please try again.`);
    }
}

// Fixed displayVolunteers function with better styling
function displayVolunteers(volunteers) {
    volunteerTable.innerHTML = "";
    if (volunteers.length === 0) {
        volunteerTable.innerHTML = `<tr><td colspan="7" class="text-center text-muted">No volunteers found</td></tr>`;
        return;
    }

    volunteers.forEach((v) => {
        const row = document.createElement("tr");
        
        // Create action buttons with better styling
        let actionButtons = '';
        const normalizedStatus = (v.status || '').toLowerCase();
        
        if (normalizedStatus === 'pending') {
            actionButtons = `
                <button class="action-btn accept-btn" data-id="${v.id}" data-mission-id="${v.missionId}" title="Accept Application">
                    <i class="fas fa-check"></i> Accept
                </button>
                <button class="action-btn reject-btn" data-id="${v.id}" data-mission-id="${v.missionId}" title="Reject Application">
                    <i class="fas fa-times"></i> Reject
                </button>
            `;
        } else if (normalizedStatus === 'approved') {
            actionButtons = `
                <span class="status-badge approved-badge">
                    <i class="fas fa-check-circle"></i> Accepted
                </span>
            `;
        } else if (normalizedStatus === 'rejected') {
            actionButtons = `
                <span class="status-badge rejected-badge">
                    <i class="fas fa-times-circle"></i> Rejected
                </span>
            `;
        } else {
            actionButtons = `
                <span class="status-badge unknown-badge">
                    <i class="fas fa-question-circle"></i> Unknown
                </span>
            `;
        }
        
        // Fixed table structure with better styling
        row.innerHTML = `
            <td>${v.name || "N/A"}</td>
            <td>${v.email || "N/A"}</td>
            <td>${v.phone || "N/A"}</td>
            <td>${v.occupation || "N/A"}</td>
            <td>${v.missionName || "N/A"}</td>
            <td><span class="status-badge ${getStatusBadgeClass(v.status)}">${getStatusIcon(v.status)} ${v.status || "N/A"}</span></td>
            <td>${actionButtons}</td>
        `;
        volunteerTable.appendChild(row);
    });

    document.querySelectorAll(".accept-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
            const el = e.target.closest(".accept-btn");
            if (!el?.dataset?.id) return;
            updateApplicationStatus(el.dataset.id, el.dataset.missionId, "approved");
        });
    });

    document.querySelectorAll(".reject-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
            const el = e.target.closest(".reject-btn");
            if (!el?.dataset?.id) return;
            openRejectModal(el.dataset.id, el.dataset.missionId);
        });
    });
}

// Status badge class function with better styling
function getStatusBadgeClass(status) {
    const normalizedStatus = (status || '').toLowerCase();
    switch(normalizedStatus) {
        case 'pending': return 'pending-badge';
        case 'approved': return 'approved-badge';
        case 'rejected': return 'rejected-badge';
        default: return 'unknown-badge';
    }
}

// Function to get status icons
function getStatusIcon(status) {
    const normalizedStatus = (status || '').toLowerCase();
    switch(normalizedStatus) {
        case 'pending': return '<i class="fas fa-clock"></i>';
        case 'approved': return '<i class="fas fa-check-circle"></i>';
        case 'rejected': return '<i class="fas fa-times-circle"></i>';
        default: return '<i class="fas fa-question-circle"></i>';
    }
}

function showDetails(v) {
    const rejectedBlock =
        (v.status || "").toLowerCase() === "rejected" && (v.rejectionReason || "").trim()
            ? `<p><strong>Reason for rejection:</strong> ${escapeHtml(v.rejectionReason.trim())}</p>`
            : "";
    modalBody.innerHTML = `
        <p><strong>Name:</strong> ${escapeHtml(v.name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(v.email)}</p>
        <p><strong>Phone:</strong> ${escapeHtml(v.phone || "N/A")}</p>
        <p><strong>Occupation:</strong> ${escapeHtml(v.occupation || "N/A")}</p>
        <p><strong>Mission:</strong> ${escapeHtml(v.missionName || "N/A")}</p>
        <p><strong>Status:</strong> ${escapeHtml(v.status || "N/A")}</p>
        <p><strong>Applied At:</strong> ${v.appliedAt || "N/A"}</p>
        ${rejectedBlock}
    `;
    detailsModal.show();
}

// Search functionality
searchInput.addEventListener("input", () => {
    const term = searchInput.value.toLowerCase();
    const filtered = allVolunteers.filter(
        (v) =>
            (v.name && v.name.toLowerCase().includes(term)) ||
            (v.email && v.email.toLowerCase().includes(term))
    );
    displayVolunteers(filtered);
    updateVolunteerCounts(filtered);
});

// Mission filter functionality
filterSelect.addEventListener("change", () => {
    const selectedMissionId = filterSelect.value;
    
    if (!selectedMissionId) {
        // Show all volunteers
        displayVolunteers(allVolunteers);
        updateVolunteerCounts(allVolunteers);
    } else {
        // Filter volunteers by selected mission
        const filteredVolunteers = allVolunteers.filter(volunteer => volunteer.missionId === selectedMissionId);
        displayVolunteers(filteredVolunteers);
        updateVolunteerCounts(filteredVolunteers);
        console.log("Selected mission:", selectedMissionId);
        console.log("Filtered volunteers:", filteredVolunteers.length);
    }
});