import { auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { getOrgProfileOnce } from "./org-verification.js";
import {
    ORG_CACHE_KEYS,
    NAV_FRESH_MS,
    readOrgCache,
    writeOrgCache,
    isOrgCacheFresh,
} from "./org-data-cache.js";

function updateSidebarAvatar(data) {
  const wrap = document.querySelector(".sidebar-user-avatar");
  const img = document.getElementById("sidebarUserAvatarImg");
  if (!wrap || !img) return;
  const pic =
    (data &&
      (data.profilePictureBase64 ||
        data.profilePictureURL ||
        data.documents?.logo?.url)) ||
    null;
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
      const applySidebar = (displayName, orgData) => {
        updateSidebarAvatar(orgData);
        if (orgNameEl) orgNameEl.textContent = displayName;
        if (welcomeNameEl) welcomeNameEl.textContent = displayName;
        if (sidebarNameEl) sidebarNameEl.textContent = displayName;
        if (sidebarInitialEl) {
          const ch = String(displayName).trim().charAt(0);
          sidebarInitialEl.textContent = ch ? ch.toUpperCase() : "?";
        }
      };

      const cached = readOrgCache(user.uid, ORG_CACHE_KEYS.SIDEBAR);
      if (cached?.payload) {
        applySidebar(cached.payload.displayName, cached.payload.orgData);
        if (isOrgCacheFresh(user.uid, ORG_CACHE_KEYS.SIDEBAR, NAV_FRESH_MS)) {
          return;
        }
      }

      const orgData = await getOrgProfileOnce(user.uid);
      let displayName;
      if (orgData) {
        displayName =
          (orgData.name && String(orgData.name).trim()) ||
          (orgData.orgName && String(orgData.orgName).trim()) ||
          user.displayName ||
          user.email;
      } else {
        displayName = user.displayName || user.email;
      }

      writeOrgCache(user.uid, ORG_CACHE_KEYS.SIDEBAR, { displayName, orgData });
      applySidebar(displayName, orgData);
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
