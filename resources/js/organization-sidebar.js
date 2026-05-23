import { auth, db } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

function updateSidebarAvatar(data) {
    const wrap = document.querySelector(".sidebar-user-avatar");
    const img = document.getElementById("sidebarUserAvatarImg");
    if (!wrap || !img) return;
    const pic =
        (data && (data.profilePictureBase64 || data.profilePictureURL)) || null;
    if (pic) {
        img.src = pic;
        wrap.classList.add("has-photo");
    } else {
        img.removeAttribute("src");
        wrap.classList.remove("has-photo");
    }
}

function setSidebarUserName(displayName) {
    const sidebarNameEl = document.getElementById("sidebarUserName");
    const sidebarInitialEl = document.getElementById("sidebarUserInitial");
    const welcomeNameEl = document.getElementById("orgNameWelcome");

    if (sidebarNameEl) sidebarNameEl.textContent = displayName;
    if (welcomeNameEl) welcomeNameEl.textContent = displayName;
    if (sidebarInitialEl) {
        const ch = String(displayName).trim().charAt(0);
        sidebarInitialEl.textContent = ch ? ch.toUpperCase() : "?";
    }
}

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        if (!window.location.pathname.includes("/organization/login")) {
            window.location.href = "/organization/login";
        }
        return;
    }

    try {
        const snap = await getDoc(doc(db, "organizations", user.uid));
        let displayName;
        let orgData = null;

        if (snap.exists()) {
            orgData = snap.data();
            displayName =
                (orgData.name && String(orgData.name).trim()) ||
                (orgData.orgName && String(orgData.orgName).trim()) ||
                user.displayName ||
                user.email;
        } else {
            displayName = user.displayName || user.email;
        }

        updateSidebarAvatar(orgData);
        setSidebarUserName(displayName);
    } catch (err) {
        console.warn("[WARN] sidebar user:", err);
        const fallback = user.displayName || user.email;
        updateSidebarAvatar(null);
        setSidebarUserName(fallback);
    }
});
