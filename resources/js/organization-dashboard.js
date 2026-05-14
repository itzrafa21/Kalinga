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

onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "/organization/login";
      return;
    }
  
    const orgNameEl = document.getElementById("orgName");
    const welcomeNameEl = document.getElementById("orgNameWelcome");
    const sidebarNameEl = document.getElementById("sidebarUserName");
    const sidebarInitialEl = document.getElementById("sidebarUserInitial");

    try {
      const docRef = doc(db, "organizations", user.uid);
      const snap = await getDoc(docRef);

      let displayName;
      let orgData = null;

      if (snap.exists()) {
        orgData = snap.data();
        console.log("[SUCCESS] Org data:", orgData);

        displayName =
          (orgData.name && String(orgData.name).trim()) ||
          (orgData.orgName && String(orgData.orgName).trim()) ||
          user.displayName ||
          user.email;
      } else {
        displayName = user.displayName || user.email;
      }

      updateSidebarAvatar(orgData);
      if (orgNameEl) orgNameEl.textContent = displayName;
      if (welcomeNameEl) welcomeNameEl.textContent = displayName;
      if (sidebarNameEl) sidebarNameEl.textContent = displayName;
      if (sidebarInitialEl) {
        const ch = String(displayName).trim().charAt(0);
        sidebarInitialEl.textContent = ch ? ch.toUpperCase() : "?";
      }
    } catch (err) {
      console.error("[ERROR] Error loading org name:", err);
      const fallback = user.displayName || user.email;
      if (orgNameEl) orgNameEl.textContent = fallback;
      if (welcomeNameEl) welcomeNameEl.textContent = fallback;
      if (sidebarNameEl) sidebarNameEl.textContent = fallback;
      if (sidebarInitialEl) {
        const ch = String(fallback).trim().charAt(0);
        sidebarInitialEl.textContent = ch ? ch.toUpperCase() : "?";
      }
      updateSidebarAvatar(null);
    }
  });
