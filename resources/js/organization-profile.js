import { auth, db } from "./firebase";
import { doc, updateDoc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential, onAuthStateChanged } from "firebase/auth";

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

async function loadProfileStats(uid) {
  const elTotal = document.getElementById("totalMissions");
  const elActive = document.getElementById("activeMissions");
  const elVol = document.getElementById("totalVolunteers");
  if (!elTotal || !elActive || !elVol) return;

  try {
    const missionsRef = collection(db, "organizations", uid, "missions");
    const historyRef = collection(db, "organizations", uid, "history");

    const [missionsSnap, historySnap] = await Promise.all([
      getDocs(missionsRef),
      getDocs(historyRef),
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

    const missionIds = new Set([
      ...missionsSnap.docs.map((d) => d.id),
      ...historySnap.docs.map((d) => d.id),
    ]);

    let approvedVolunteers = 0;
    for (const missionId of missionIds) {
      try {
        const appsRef = collection(db, "missions", missionId, "applications");
        const appsSnap = await getDocs(appsRef);
        appsSnap.forEach((a) => {
          const st = (a.data().status || "").toLowerCase();
          if (st === "approved" || st === "accepted") approvedVolunteers++;
        });
      } catch (_) {}
    }

    elTotal.textContent = String(total);
    elActive.textContent = String(active);
    elVol.textContent = String(approvedVolunteers);
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

  currentUser = user;
  orgRef = doc(db, "organizations", user.uid);

  const orgSnap = await getDoc(orgRef);

  if (orgSnap.exists()) {
    const data = orgSnap.data();

    document.getElementById("orgId").value = user.uid;
    document.getElementById("orgName").value = data.name || data.orgName || "";
    document.getElementById("email").value = user.email || "";
    document.getElementById("phone").value = data.phone || "";
    document.getElementById("address").value = data.address || "";
    document.getElementById("city").value = data.city || "";
    document.getElementById("state").value = data.state || "";
    document.getElementById("postalCode").value = data.postalCode || "";
    const countryEl = document.getElementById("country");
    if (countryEl && countryEl.tagName === "SELECT") {
      countryEl.value = data.country || "";
      if (data.country && !Array.from(countryEl.options).some((o) => o.value === data.country)) {
        const opt = document.createElement("option");
        opt.value = data.country;
        opt.textContent = data.country;
        countryEl.appendChild(opt);
        countryEl.value = data.country;
      }
    } else if (countryEl) {
      countryEl.value = data.country || "";
    }

    updateProfileHeader(data, user);
    setLastUpdatedFooter(data);
    await loadProfileStats(user.uid);

    if (data.profilePictureBase64) {
      loadProfilePicture(data.profilePictureBase64);
    } else if (data.profilePictureURL) {
      loadProfilePicture(data.profilePictureURL);
    } else {
      resetProfilePicture();
    }
  } else {
    await setDoc(orgRef, {
      name: user.displayName || "New Organization",
      orgName: user.displayName || "New Organization",
      email: user.email,
      phone: "",
      address: "",
      city: "",
      state: "",
      postalCode: "",
      country: "",
      createdAt: new Date(),
      orgId: user.uid,
    });

    document.getElementById("orgId").value = user.uid;
    document.getElementById("orgName").value = user.displayName || "New Organization";
    document.getElementById("email").value = user.email || "";
    document.getElementById("phone").value = "";
    document.getElementById("address").value = "";
    document.getElementById("city").value = "";
    document.getElementById("state").value = "";
    document.getElementById("postalCode").value = "";
    document.getElementById("country").value = "";

    updateProfileHeader(
      { name: user.displayName || "New Organization", orgName: user.displayName },
      user
    );
    setLastUpdatedFooter({});
    await loadProfileStats(user.uid);
    resetProfilePicture();
  }

  initializeFormHandlers();
});

function loadProfilePicture(imageData) {
  const profilePicturePreview = document.getElementById("profilePicturePreview");
  const placeholder = document.getElementById("profilePicturePlaceholder");
  const removeBtn = document.getElementById("removeProfilePicture");

  if (profilePicturePreview && placeholder && removeBtn) {
    try {
      profilePicturePreview.innerHTML = `<img src="${imageData}" alt="Profile Picture" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
      placeholder.style.display = "none";
      removeBtn.style.display = "inline-flex";
    } catch (error) {
      console.error("[ERROR] Error loading profile picture:", error);
      resetProfilePicture();
    }
  }
}

function resetProfilePicture() {
  const profilePicturePreview = document.getElementById("profilePicturePreview");
  const removeBtn = document.getElementById("removeProfilePicture");
  const profilePictureInput = document.getElementById("profilePictureInput");

  if (profilePicturePreview && removeBtn && profilePictureInput) {
    profilePicturePreview.innerHTML =
      '<span id="profilePicturePlaceholder"><i class="bi bi-person"></i></span>';
    removeBtn.style.display = "none";
    profilePictureInput.value = "";
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
  }
  if (profileEmail) profileEmail.textContent = user.email || "No email";
}

function initializeFormHandlers() {
  const form = document.getElementById("profileForm");
  if (!form) {
    console.error("[ERROR] Profile form not found!");
    return;
  }

  const profilePictureInput = document.getElementById("profilePictureInput");
  const profilePicturePreview = document.getElementById("profilePicturePreview");
  const placeholder = document.getElementById("profilePicturePlaceholder");
  const removeBtn = document.getElementById("removeProfilePicture");

  if (profilePictureInput) {
    profilePictureInput.addEventListener("change", async function (e) {
      const file = e.target.files[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        alert("Please select a valid image file.");
        this.value = "";
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        alert("File size must be less than 2MB for Base64 storage.");
        this.value = "";
        return;
      }
      try {
        const base64Image = await convertToBase64(file);
        if (profilePicturePreview && placeholder && removeBtn) {
          profilePicturePreview.innerHTML = `<img src="${base64Image}" alt="Profile Picture" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
          placeholder.style.display = "none";
          removeBtn.style.display = "inline-flex";
        }
        await updateDoc(orgRef, {
          profilePictureBase64: base64Image,
          profilePictureURL: null,
        });
        alert("[SUCCESS] Profile picture updated successfully!");
      } catch (error) {
        console.error("[ERROR] Error storing profile picture:", error);
        alert("Failed to store profile picture. Please try again.");
        resetProfilePicture();
      }
    });
  }

  if (removeBtn) {
    removeBtn.addEventListener("click", async function () {
      if (!confirm("Are you sure you want to remove your profile picture?")) return;
      try {
        await updateDoc(orgRef, {
          profilePictureBase64: null,
          profilePictureURL: null,
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
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = "Saving...";
    }

    try {
      const orgName = document.getElementById("orgName").value;
      const phone = document.getElementById("phone").value;
      const address = document.getElementById("address").value;
      const city = document.getElementById("city").value;
      const state = document.getElementById("state").value;
      const postalCode = document.getElementById("postalCode").value;
      const country = document.getElementById("country").value;

      await updateDoc(orgRef, {
        name: orgName,
        orgName: orgName,
        phone,
        address,
        city,
        state,
        postalCode,
        country,
        email: currentUser.email,
        updatedAt: new Date(),
      });

      updateProfileHeader({ name: orgName, orgName }, currentUser);
      setLastUpdatedFooter({ updatedAt: new Date() });
      alert("[SUCCESS] Profile updated successfully!");
    } catch (err) {
      console.error("[ERROR] Error updating profile:", err);
      alert(`Failed to update profile: ${err.message}`);
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = "Save Changes";
      }
    }
  });
}

function convertToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
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