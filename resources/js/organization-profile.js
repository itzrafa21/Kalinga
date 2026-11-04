import { auth, db } from "./firebase";
import { doc, updateDoc, getDoc, setDoc, collection, getDocs, deleteField } from "firebase/firestore";
import {
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";
import {
  assertOrgVerified,
  syncOrganizationNameToSubmissions,
} from "./org-verification.js";
import {
  ORG_CLOUDINARY,
  uploadImageToCloudinary,
  cloudinaryUrlWithTransform,
} from "./cloudinary-upload";
import {
  ORG_CACHE_KEYS,
  readOrgCache,
  writeOrgCache,
  isOrgCacheStale,
  invalidateOrgCache,
} from "./org-data-cache.js";
import { countOrgApprovedVolunteers } from "./application-storage.js";

const PROFILE_STATS_VERSION = 2;

function readValue(id) {
  return document.getElementById(id)?.value?.trim() || "";
}

function setValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value ?? "";
}

function setSelectValue(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  const next = value ?? "";
  if (!next) {
    el.value = "";
    return;
  }
  const exists = Array.from(el.options).some((o) => o.value === next);
  if (!exists) {
    const opt = document.createElement("option");
    opt.value = next;
    opt.textContent = next;
    el.appendChild(opt);
  }
  el.value = next;
}

function readMultiValues(fieldKey) {
  const root = document.querySelector(`[data-multi-field="${fieldKey}"]`);
  if (!root) return [];
  return Array.from(root.querySelectorAll(".multi-field-row input"))
    .map((input) => input.value.trim())
    .filter(Boolean);
}

function syncMultiFieldPrimary(root, fieldKey) {
  const inputs = root.querySelectorAll(".multi-field-row input");
  inputs.forEach((input, index) => {
    input.removeAttribute("id");
    input.removeAttribute("data-multi-primary");
    if (index === 0) {
      input.id = fieldKey;
      input.setAttribute("data-multi-primary", "");
    }
  });
  const label = root.querySelector(".form-label");
  if (label && inputs[0]) label.setAttribute("for", fieldKey);
}

function syncMultiFieldActions(root) {
  const rows = root.querySelectorAll(".multi-field-row");
  rows.forEach((row, index) => {
    const btn = row.querySelector(".multi-field-action");
    if (!btn) return;
    if (index === rows.length - 1) {
      btn.classList.remove("is-remove");
      btn.removeAttribute("data-multi-remove");
      btn.setAttribute("data-multi-add", "");
      btn.setAttribute("aria-label", btn.dataset.addLabel || "Add another field");
      btn.textContent = "+";
    } else {
      btn.classList.add("is-remove");
      btn.removeAttribute("data-multi-add");
      btn.setAttribute("data-multi-remove", "");
      btn.setAttribute("aria-label", "Remove this field");
      btn.textContent = "−";
    }
  });
}

function createMultiFieldRow(templateInput, fieldKey) {
  const row = document.createElement("div");
  row.className = "multi-field-row";

  const input = document.createElement("input");
  input.type = templateInput.type || "text";
  input.className = "form-control";
  input.name = `${fieldKey}[]`;
  input.placeholder = templateInput.placeholder || "";

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "multi-field-action";
  btn.dataset.addLabel =
    templateInput.closest(".multi-field")?.querySelector("[data-multi-add]")?.getAttribute("aria-label") ||
    "Add another field";
  btn.setAttribute("data-multi-add", "");
  btn.setAttribute("aria-label", btn.dataset.addLabel);
  btn.textContent = "+";

  row.append(input, btn);
  return row;
}

function fillMultiField(fieldKey, values) {
  const root = document.querySelector(`[data-multi-field="${fieldKey}"]`);
  if (!root) return;
  const list = root.querySelector(".multi-field-list");
  const primary = root.querySelector("[data-multi-primary]");
  if (!list || !primary) return;

  const items = (Array.isArray(values) ? values : [values])
    .map((v) => String(v ?? "").trim())
    .filter(Boolean);

  list.querySelectorAll(".multi-field-row").forEach((row, index) => {
    if (index > 0) row.remove();
  });

  primary.value = items[0] || "";
  items.slice(1).forEach((value) => {
    const row = createMultiFieldRow(primary, fieldKey);
    const input = row.querySelector("input");
    if (input) input.value = value;
    list.appendChild(row);
  });

  syncMultiFieldPrimary(root, fieldKey);
  syncMultiFieldActions(root);
}

function initMultiFields() {
  document.querySelectorAll("[data-multi-field]").forEach((root) => {
    const fieldKey = root.dataset.multiField;
    const list = root.querySelector(".multi-field-list");
    const primary = root.querySelector("[data-multi-primary]");
    if (!list || !primary) return;

    const addLabel =
      root.querySelector("[data-multi-add]")?.getAttribute("aria-label") || "Add another field";
    root.querySelectorAll(".multi-field-action").forEach((btn) => {
      btn.dataset.addLabel = addLabel;
    });
    syncMultiFieldActions(root);

    root.addEventListener("click", (e) => {
      const addBtn = e.target.closest("[data-multi-add]");
      const removeBtn = e.target.closest("[data-multi-remove]");

      if (addBtn && root.contains(addBtn)) {
        e.preventDefault();
        const template = root.querySelector("[data-multi-primary]") || primary;
        const row = createMultiFieldRow(template, fieldKey);
        list.appendChild(row);
        syncMultiFieldPrimary(root, fieldKey);
        syncMultiFieldActions(root);
        row.querySelector("input")?.focus();
        return;
      }

      if (removeBtn && root.contains(removeBtn)) {
        e.preventDefault();
        if (root.querySelectorAll(".multi-field-row").length <= 1) return;
        removeBtn.closest(".multi-field-row")?.remove();
        syncMultiFieldPrimary(root, fieldKey);
        syncMultiFieldActions(root);
      }
    });
  });
}

function fillProfileForm(data, user) {
  setValue("orgId", user.uid);
  setValue("orgName", data.name || data.orgName || "");
  setSelectValue("orgType", data.orgType || "");
  setValue("orgDescription", data.orgDescription || "");
  setValue("yearEstablished", data.yearEstablished || "");
  setValue("completeAddress", data.completeAddress || data.address || "");
  setSelectValue("orgScope", data.orgScope || "");
  setValue("username", data.username || "");
  setValue("email", user.email || data.email || "");

  const websites =
    data.orgWebsites?.length ? data.orgWebsites : data.orgWebsite ? [data.orgWebsite] : [];
  const emails =
    data.orgEmails?.length
      ? data.orgEmails
      : data.orgEmail
        ? [data.orgEmail]
        : data.email && data.email !== user.email
          ? [data.email]
          : [];
  const contacts =
    data.orgContactNumbers?.length
      ? data.orgContactNumbers
      : data.orgContactNumber
        ? [data.orgContactNumber]
        : data.phone
          ? [data.phone]
          : [];

  fillMultiField("orgWebsite", websites);
  fillMultiField("orgEmail", emails);
  fillMultiField("orgContactNumber", contacts);

  const rep = data.representative || {};
  setValue("repFullName", rep.fullName || "");
  setValue("repPosition", rep.position || "");
  setValue("repEmail", rep.email || "");
  setValue("repContactNumber", rep.contactNumber || "");
}

function openProfileSaveSuccessModal(message) {
  const overlay = document.getElementById("profileSaveSuccessModal");
  const messageEl = document.getElementById("profileSaveSuccessMessage");
  if (!overlay) return;
  if (messageEl && message) {
    messageEl.textContent = message;
  }
  overlay.removeAttribute("hidden");
  overlay.classList.add("is-open");
  document.body.style.overflow = "hidden";
  document.getElementById("profileSaveSuccessOk")?.focus();
}

function closeProfileSaveSuccessModal() {
  const overlay = document.getElementById("profileSaveSuccessModal");
  if (!overlay) return;
  overlay.setAttribute("hidden", "");
  overlay.classList.remove("is-open");
  document.body.style.overflow = "";
}

function initProfileSaveSuccessModal() {
  const overlay = document.getElementById("profileSaveSuccessModal");
  if (!overlay) return;

  const onClose = () => closeProfileSaveSuccessModal();

  document.getElementById("profileSaveSuccessOk")?.addEventListener("click", onClose);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) onClose();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.classList.contains("is-open")) {
      onClose();
    }
  });
}

function normalizeProfilePictureSrc(src) {
  let raw = String(src ?? "").trim();
  if (!raw) return "";
  if (raw.startsWith("//")) return `https:${raw}`;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/cloudinary\.com/i.test(raw)) return `https://${raw.replace(/^\/+/, "")}`;
  return raw;
}

function resolveProfilePicture(data) {
  const url = normalizeProfilePictureSrc(
    data?.profilePictureURL || data?.documents?.logo?.url || data?.logoURL
  );
  if (url) {
    return cloudinaryUrlWithTransform(url, ORG_CLOUDINARY.avatarTransform);
  }
  return data?.profilePictureBase64 || "";
}
let currentUser = null;
let orgRef = null;

function passwordRulesMet(pw) {
  const s = String(pw || "");
  return {
    len: s.length >= 8,
    mix: /[a-z]/.test(s) && /[A-Z]/.test(s),
    num: /\d/.test(s),
    spec: /[^A-Za-z0-9]/.test(s),
  };
}

function updatePasswordRulesUi() {
  const v = document.getElementById("newPassword")?.value || "";
  const r = passwordRulesMet(v);
  const set = (id, ok) => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle("met", !!ok);
  };
  set("req-len", r.len);
  set("req-mix", r.mix);
  set("req-num", r.num);
  set("req-spec", r.spec);
}

function bindPasswordToggles() {
  document.querySelectorAll("[data-toggle-password]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-toggle-password");
      const input = document.getElementById(id);
      const icon = btn.querySelector("i");
      if (!input) return;
      input.type = input.type === "password" ? "text" : "password";
      if (icon) {
        icon.classList.toggle("bi-eye", input.type === "password");
        icon.classList.toggle("bi-eye-slash", input.type === "text");
      }
    });
  });
}

function setLastUpdatedFooter(data) {
  const el = document.getElementById("profileFooterUpdated");
  if (!el) return;
  let d = null;
  if (data.updatedAt) {
    d = data.updatedAt.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt);
  } else if (data.createdAt) {
    d = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
  }
  if (!d || Number.isNaN(d.getTime())) {
    el.textContent = "Last updated: —";
    return;
  }
  el.textContent =
    "Last updated: " +
    d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
}

function applyProfileStatsToDom(stats) {
  const elTotal = document.getElementById("totalMissions");
  const elActive = document.getElementById("activeMissions");
  const elVol = document.getElementById("totalVolunteers");
  if (!elTotal || !elActive || !elVol || !stats) return;
  elTotal.textContent = String(stats.total ?? 0);
  elActive.textContent = String(stats.active ?? 0);
  elVol.textContent = String(stats.volunteers ?? 0);
}

async function loadProfileStats(uid, { refresh = true } = {}) {
  const elTotal = document.getElementById("totalMissions");
  const elActive = document.getElementById("activeMissions");
  const elVol = document.getElementById("totalVolunteers");
  if (!elTotal || !elActive || !elVol) return;

  const cached = readOrgCache(uid, ORG_CACHE_KEYS.PROFILE);
  const cacheVersion = cached?.payload?.statsVersion;
  if (cached?.payload?.stats && cacheVersion === PROFILE_STATS_VERSION) {
    applyProfileStatsToDom(cached.payload.stats);
  } else if (cached && cacheVersion !== PROFILE_STATS_VERSION) {
    invalidateOrgCache(uid, ORG_CACHE_KEYS.PROFILE);
  }

  if (
    cached &&
    cacheVersion === PROFILE_STATS_VERSION &&
    !refresh
  ) {
    return;
  }

  if (
    cached &&
    cacheVersion === PROFILE_STATS_VERSION &&
    !isOrgCacheStale(uid, ORG_CACHE_KEYS.PROFILE)
  ) {
    return;
  }

  try {
    const missionsRef = collection(db, "organizations", uid, "missions");
    const historyRef = collection(db, "organizations", uid, "history");

    const [missionsSnap, historySnap, volunteerCount] = await Promise.all([
      getDocs(missionsRef),
      getDocs(historyRef),
      countOrgApprovedVolunteers(uid),
    ]);

    const total = missionsSnap.size + historySnap.size;

    let active = 0;
    missionsSnap.forEach((docSnap) => {
      const mission = docSnap.data();
      const normalizedStatus = (mission.status || "").toLowerCase();
      if (normalizedStatus === "open" || normalizedStatus === "ongoing") {
        active++;
      }
    });

    elTotal.textContent = String(total);
    elActive.textContent = String(active);
    elVol.textContent = String(volunteerCount);

    writeOrgCache(uid, ORG_CACHE_KEYS.PROFILE, {
      statsVersion: PROFILE_STATS_VERSION,
      stats: { total, active, volunteers: volunteerCount },
    });
  } catch (e) {
    console.error("[ERROR] loadProfileStats:", e);
    elTotal.textContent = "0";
    elActive.textContent = "0";
    elVol.textContent = "0";
  }
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    console.warn("[WARNING] No user logged in!");
    window.location.href = "/organization/login";
    return;
  }
  if (!(await assertOrgVerified(user))) return;

  currentUser = user;
  orgRef = doc(db, "organizations", user.uid);

  const orgSnap = await getDoc(orgRef);

  initMultiFields();

  if (orgSnap.exists()) {
    const data = orgSnap.data();
    fillProfileForm(data, user);

    updateProfileHeader(data, user);
    setLastUpdatedFooter(data);
    await loadProfileStats(user.uid, { refresh: false });

    const pic = resolveProfilePicture(data);
    if (pic) {
      loadProfilePicture(pic);
    } else {
      resetProfilePicture();
    }
  } else {
    await setDoc(orgRef, {
      name: user.displayName || "New Organization",
      orgName: user.displayName || "New Organization",
      email: user.email,
      orgType: "",
      orgDescription: "",
      yearEstablished: "",
      orgWebsite: "",
      orgWebsites: [],
      orgEmail: "",
      orgEmails: [],
      orgContactNumber: "",
      orgContactNumbers: [],
      completeAddress: "",
      orgScope: "",
      username: "",
      representative: {},
      createdAt: new Date(),
      orgId: user.uid,
    });

    fillProfileForm(
      {
        name: user.displayName || "New Organization",
        orgName: user.displayName || "New Organization",
        email: user.email,
      },
      user
    );

    updateProfileHeader(
      { name: user.displayName || "New Organization", orgName: user.displayName },
      user
    );
    setLastUpdatedFooter({});
    await loadProfileStats(user.uid, { refresh: false });
    resetProfilePicture();
  }

  initializeFormHandlers();
});

function updateSidebarUser(data, user) {
  const sidebarNameEl = document.getElementById("sidebarUserName");
  const sidebarInitialEl = document.getElementById("sidebarUserInitial");
  const wrap = document.querySelector(".sidebar-user-avatar");
  const img = document.getElementById("sidebarUserAvatarImg");

  const display =
    (data?.name && String(data.name).trim()) ||
    (data?.orgName && String(data.orgName).trim()) ||
    user?.displayName ||
    "Organization";

  if (sidebarNameEl) sidebarNameEl.textContent = display;
  if (sidebarInitialEl) {
    const ch = String(display).trim().charAt(0);
    sidebarInitialEl.textContent = ch ? ch.toUpperCase() : "?";
  }

  if (!wrap || !img) return;
  const pic = resolveProfilePicture(data);
  if (pic) {
    img.src = pic;
    wrap.classList.add("has-photo");
  } else {
    img.removeAttribute("src");
    wrap.classList.remove("has-photo");
  }
}


function loadProfilePicture(imageData) {
  const avatar = document.getElementById("profileAvatar");
  const initial = document.getElementById("avatarInitial");
  const removeBtn = document.getElementById("removeProfilePicture");
  if (!avatar || !initial) return;

  try {
    let img = document.getElementById("profileAvatarImg");
    if (!img) {
      img = document.createElement("img");
      img.id = "profileAvatarImg";
      img.alt = "Organization logo";
      img.addEventListener("error", () => {
        console.warn("[WARN] Profile logo failed to load");
        resetProfilePicture();
      });
      avatar.appendChild(img);
    }
    img.src = imageData;
    avatar.classList.add("has-photo");
    initial.style.display = "none";
    if (removeBtn) removeBtn.style.display = "inline-block";

    const wrap = document.querySelector(".sidebar-user-avatar");
    const sidebarImg = document.getElementById("sidebarUserAvatarImg");
    if (wrap && sidebarImg) {
      sidebarImg.src = imageData;
      wrap.classList.add("has-photo");
    }
  } catch (error) {
    console.error("[ERROR] Error loading profile picture:", error);
    resetProfilePicture();
  }
}

function resetProfilePicture() {
  const avatar = document.getElementById("profileAvatar");
  const initial = document.getElementById("avatarInitial");
  const removeBtn = document.getElementById("removeProfilePicture");
  const profilePictureInput = document.getElementById("profilePictureInput");
  const img = document.getElementById("profileAvatarImg");

  if (img) img.remove();
  if (avatar) avatar.classList.remove("has-photo");
  if (initial) initial.style.display = "";
  if (removeBtn) removeBtn.style.display = "none";
  if (profilePictureInput) profilePictureInput.value = "";

  const wrap = document.querySelector(".sidebar-user-avatar");
  const sidebarImg = document.getElementById("sidebarUserAvatarImg");
  if (wrap && sidebarImg) {
    sidebarImg.removeAttribute("src");
    wrap.classList.remove("has-photo");
  }
}

function updateProfileHeader(data, user) {
  const profileName = document.getElementById("profileName");
  const profileEmail = document.getElementById("profileEmail");
  const avatarInitial = document.getElementById("avatarInitial");

  const display =
    (data.name && String(data.name).trim()) ||
    (data.orgName && String(data.orgName).trim()) ||
    user.displayName ||
    "Organization";

  if (profileName) profileName.textContent = display;
  if (avatarInitial) {
    avatarInitial.textContent = display.charAt(0).toUpperCase() || "O";
    const hasPhoto = document.getElementById("profileAvatar")?.classList.contains("has-photo");
    avatarInitial.style.display = hasPhoto ? "none" : "";
  }
  if (profileEmail) profileEmail.textContent = user.email || "No email";
  updateSidebarUser(data, user);
}

function initializeFormHandlers() {
  initProfileSaveSuccessModal();

  const form = document.getElementById("profileForm");
  if (!form) {
    console.error("[ERROR] Profile form not found!");
    return;
  }

  const profilePictureInput = document.getElementById("profilePictureInput");
  const removeBtn = document.getElementById("removeProfilePicture");
  const uploadBtn = document.getElementById("profileAvatarUploadBtn");
  const avatarEl = document.getElementById("profileAvatar");

  const openFilePicker = () => profilePictureInput?.click();
  uploadBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    openFilePicker();
  });
  avatarEl?.addEventListener("click", openFilePicker);

  if (profilePictureInput) {
    profilePictureInput.addEventListener("change", async function (e) {
      const file = e.target.files[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        alert("Please select a valid image file.");
        this.value = "";
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert("File size must be less than 5MB.");
        this.value = "";
        return;
      }
      const uploadBtnEl = document.getElementById("profileAvatarUploadBtn");
      const prevUploadHtml = uploadBtnEl?.innerHTML;
      try {
        if (uploadBtnEl) {
          uploadBtnEl.disabled = true;
          uploadBtnEl.innerHTML = '<i class="bi bi-hourglass-split"></i>';
        }
        const imageUrl = await uploadImageToCloudinary(file, {
          folder: ORG_CLOUDINARY.folder,
          publicId: `${currentUser.uid}/${ORG_CLOUDINARY.avatarPublicId}`,
          tags: ["organization", "avatar", currentUser.uid],
        });
        const displayUrl = cloudinaryUrlWithTransform(
          imageUrl,
          ORG_CLOUDINARY.avatarTransform
        );
        loadProfilePicture(displayUrl);
        await updateDoc(orgRef, {
          profilePictureURL: imageUrl,
          profilePictureBase64: deleteField(),
        });
        invalidateOrgCache(currentUser.uid, ORG_CACHE_KEYS.SIDEBAR);
        updateSidebarUser(
          { profilePictureURL: displayUrl, name: document.getElementById("orgName")?.value },
          currentUser
        );
        alert("[SUCCESS] Profile picture updated successfully!");
      } catch (error) {
        console.error("[ERROR] Error storing profile picture:", error);
        alert(error.message || "Failed to store profile picture. Please try again.");
        resetProfilePicture();
      } finally {
        if (uploadBtnEl) {
          uploadBtnEl.disabled = false;
          if (prevUploadHtml != null) uploadBtnEl.innerHTML = prevUploadHtml;
        }
        this.value = "";
      }
    });
  }

  if (removeBtn) {
    removeBtn.addEventListener("click", async function (e) {
      e.stopPropagation();
      if (!confirm("Are you sure you want to remove your profile picture?")) return;
      try {
        await updateDoc(orgRef, {
          profilePictureURL: deleteField(),
          profilePictureBase64: deleteField(),
        });
        resetProfilePicture();
        alert("[SUCCESS] Profile picture removed successfully!");
      } catch (error) {
        console.error("[ERROR] Error removing profile picture:", error);
        alert("Failed to remove profile picture. Please try again.");
      }
    });
  }

  const newPwInput = document.getElementById("newPassword");
  if (newPwInput) {
    newPwInput.addEventListener("input", updatePasswordRulesUi);
  }
  bindPasswordToggles();

  const passwordForm = document.getElementById("passwordForm");
  if (passwordForm) {
    passwordForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const currentPassword = document.getElementById("currentPassword")?.value || "";
      const newPassword = document.getElementById("newPassword")?.value || "";
      const confirmPassword = document.getElementById("confirmPassword")?.value || "";
      const changeBtn = document.getElementById("changePasswordBtn");
      const r = passwordRulesMet(newPassword);

      if (!currentPassword || !newPassword) {
        alert("Please enter your current password and a new password.");
        return;
      }
      if (newPassword !== confirmPassword) {
        alert("New password and confirmation do not match.");
        return;
      }
      if (!r.len || !r.mix || !r.num || !r.spec) {
        alert("New password must meet all requirements listed below.");
        return;
      }

      try {
        if (changeBtn) {
          changeBtn.disabled = true;
          changeBtn.textContent = "Updating...";
        }
        const cred = EmailAuthProvider.credential(currentUser.email, currentPassword);
        await reauthenticateWithCredential(currentUser, cred);
        await updatePassword(currentUser, newPassword);
        alert("[SUCCESS] Password updated successfully!");
        passwordForm.reset();
        updatePasswordRulesUi();
      } catch (err) {
        console.error("[ERROR] Password change failed:", err);
        let msg = err.message || "Could not update password.";
        if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
          msg = "Current password is incorrect.";
        } else if (err.code === "auth/weak-password") {
          msg = "New password is too weak.";
        } else if (err.code === "auth/requires-recent-login") {
          msg = "Please sign out and sign in again, then change your password.";
        }
        alert("Failed to change password: " + msg);
      } finally {
        if (changeBtn) {
          changeBtn.disabled = false;
          changeBtn.innerHTML = '<i class="bi bi-lock"></i> Change Password';
        }
      }
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const saveBtn = document.getElementById("saveBtn");
    const prevSaveHtml = saveBtn?.innerHTML;
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = "Saving...";
    }

    try {
      const orgName = readValue("orgName");
      const orgWebsites = readMultiValues("orgWebsite");
      const orgEmails = readMultiValues("orgEmail");
      const orgContactNumbers = readMultiValues("orgContactNumber");
      const completeAddress = readValue("completeAddress");
      const orgContactNumber = orgContactNumbers[0] || "";
      const orgEmail = orgEmails[0] || "";
      const orgWebsite = orgWebsites[0] || "";

      const existingSnap = await getDoc(orgRef);
      const existingRep = existingSnap.exists() ? existingSnap.data()?.representative || {} : {};

      await updateDoc(orgRef, {
        name: orgName,
        orgName: orgName,
        username: readValue("username"),
        orgType: readValue("orgType"),
        orgDescription: readValue("orgDescription"),
        yearEstablished: readValue("yearEstablished"),
        orgWebsite,
        orgWebsites,
        orgEmail,
        orgEmails,
        orgContactNumber,
        orgContactNumbers,
        completeAddress,
        orgScope: readValue("orgScope"),
        phone: orgContactNumber,
        address: completeAddress,
        email: currentUser.email,
        representative: {
          ...existingRep,
          fullName: readValue("repFullName"),
          position: readValue("repPosition"),
          email: readValue("repEmail"),
          contactNumber: readValue("repContactNumber"),
        },
        updatedAt: new Date(),
      });

      try {
        await updateProfile(currentUser, { displayName: orgName });
      } catch (profileErr) {
        console.warn("[WARN] Auth displayName update:", profileErr);
      }

      await syncOrganizationNameToSubmissions(currentUser.uid, orgName);

      invalidateOrgCache(currentUser.uid, ORG_CACHE_KEYS.SIDEBAR);
      invalidateOrgCache(currentUser.uid, ORG_CACHE_KEYS.PROFILE);

      updateProfileHeader({ name: orgName, orgName }, currentUser);
      setLastUpdatedFooter({ updatedAt: new Date() });
      openProfileSaveSuccessModal(
        "Your organization details were saved successfully."
      );
    } catch (err) {
      console.error("[ERROR] Error updating profile:", err);
      alert(`Failed to update profile: ${err.message}`);
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        if (prevSaveHtml != null) saveBtn.innerHTML = prevSaveHtml;
        else saveBtn.innerHTML = '<i class="bi bi-save"></i> Save Changes';
      }
    }
  });
}

function copyOrgId() {
  const el = document.getElementById("orgId");
  if (!el) return;
  navigator.clipboard.writeText(el.value).then(
    () => alert("Organization ID copied."),
    () => alert("Could not copy. Select and copy manually.")
  );
}
window.copyOrgId = copyOrgId;