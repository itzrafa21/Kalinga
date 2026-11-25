import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { assertOrgVerified } from "./org-verification.js";
import {
    ACCESS_MODULES,
    TEAM_ROLES,
    accessRightsForRole,
    countModulePermissions,
    createOrgTeamMember,
    findTeamMembership,
    listOrgTeam,
    normalizeAccessRights,
    roleLabel,
    setOrgTeamMemberStatus,
    updateOrgTeamAccessRights,
} from "./org-team.js";
import { clearOrgSessionCache } from "./org-session.js";

let orgId = null;
let members = [];
let accessMemberId = null;

function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function showToast(message) {
    const stack = document.getElementById("usersToastStack");
    if (!stack || !message) return;
    const el = document.createElement("div");
    el.className = "users-toast";
    el.textContent = message;
    stack.appendChild(el);
    requestAnimationFrame(() => el.classList.add("is-visible"));
    setTimeout(() => {
        el.classList.remove("is-visible");
        setTimeout(() => el.remove(), 200);
    }, 2800);
}

function setFormError(message) {
    const el = document.getElementById("addUserError");
    if (el) el.textContent = message || "";
}

function setAccessError(message) {
    const el = document.getElementById("accessRightsError");
    if (el) el.textContent = message || "";
}

function openAddModal() {
    const overlay = document.getElementById("addUserModal");
    if (!overlay) return;
    setFormError("");
    document.getElementById("addUserForm")?.reset();
    const role = document.getElementById("userRole");
    if (role) role.value = "staff";
    overlay.removeAttribute("hidden");
    overlay.classList.add("is-open");
    document.getElementById("userName")?.focus();
}

function closeAddModal() {
    const overlay = document.getElementById("addUserModal");
    if (!overlay) return;
    overlay.classList.remove("is-open");
    overlay.setAttribute("hidden", "");
}

function renderAccessModules(rights) {
    const grid = document.getElementById("accessModulesGrid");
    if (!grid) return;
    const normalized = normalizeAccessRights(rights);

    grid.innerHTML = ACCESS_MODULES.map((mod) => {
        const { enabled, total } = countModulePermissions(normalized, mod.id);
        const checks = mod.permissions
            .map(
                (perm) => `
                  <label class="access-check">
                    <input
                      type="checkbox"
                      data-access-module="${escapeHtml(mod.id)}"
                      data-access-perm="${escapeHtml(perm.id)}"
                      ${normalized[mod.id][perm.id] ? "checked" : ""}
                    >
                    <span>${escapeHtml(perm.label)}</span>
                  </label>
                `
            )
            .join("");

        return `
          <section class="access-module-card" data-module-card="${escapeHtml(mod.id)}">
            <div class="access-module-head">
              <div class="access-module-title">
                <span class="access-module-icon" aria-hidden="true"><i class="bi ${escapeHtml(mod.icon)}"></i></span>
                <strong>${escapeHtml(mod.label)}</strong>
              </div>
              <span class="access-count" data-access-count="${escapeHtml(mod.id)}">${enabled} / ${total} permissions</span>
            </div>
            <div class="access-module-body">${checks}</div>
          </section>
        `;
    }).join("");
}

function readAccessRightsFromForm() {
    const rights = normalizeAccessRights({});
    ACCESS_MODULES.forEach((mod) => {
        mod.permissions.forEach((perm) => {
            const input = document.querySelector(
                `[data-access-module="${mod.id}"][data-access-perm="${perm.id}"]`
            );
            rights[mod.id][perm.id] = Boolean(input?.checked);
        });
    });
    return rights;
}

function refreshAccessCounts() {
    const rights = readAccessRightsFromForm();
    ACCESS_MODULES.forEach((mod) => {
        const badge = document.querySelector(`[data-access-count="${mod.id}"]`);
        if (!badge) return;
        const { enabled, total } = countModulePermissions(rights, mod.id);
        badge.textContent = `${enabled} / ${total} permissions`;
    });
}

function openAccessRightsModal(member) {
    const overlay = document.getElementById("accessRightsModal");
    if (!overlay || !member) return;

    accessMemberId = member.id;
    setAccessError("");

    const nameEl = document.getElementById("accessProfileName");
    const descEl = document.getElementById("accessProfileDesc");
    if (nameEl) nameEl.value = member.name || member.username || "";
    if (descEl) {
        descEl.value = `${roleLabel(member.role)} access for @${member.username || "user"}. Choose which organization pages and actions this account can use.`;
    }

    const rights =
        member.accessRights && Object.keys(member.accessRights).length
            ? normalizeAccessRights(member.accessRights)
            : accessRightsForRole(member.role || "staff");

    renderAccessModules(rights);
    overlay.removeAttribute("hidden");
    overlay.classList.add("is-open");
}

function closeAccessRightsModal() {
    const overlay = document.getElementById("accessRightsModal");
    if (!overlay) return;
    overlay.classList.remove("is-open");
    overlay.setAttribute("hidden", "");
    accessMemberId = null;
}

function updateStats() {
    const total = members.length;
    const active = members.filter((m) => m.status !== "disabled").length;
    const disabled = total - active;
    const totalEl = document.getElementById("usersTotalCount");
    const activeEl = document.getElementById("usersActiveCount");
    const disabledEl = document.getElementById("usersDisabledCount");
    if (totalEl) totalEl.textContent = String(total);
    if (activeEl) activeEl.textContent = String(active);
    if (disabledEl) disabledEl.textContent = String(disabled);
}

function renderUsers() {
    const list = document.getElementById("usersList");
    const empty = document.getElementById("usersEmpty");
    if (!list) return;

    updateStats();

    if (!members.length) {
        list.innerHTML = "";
        if (empty) empty.hidden = false;
        return;
    }

    if (empty) empty.hidden = true;
    list.innerHTML = members
        .map((member) => {
            const disabled = member.status === "disabled";
            return `
              <article class="users-card ${disabled ? "is-disabled" : ""}" data-member-id="${escapeHtml(member.id)}">
                <div class="users-card-main">
                  <div class="users-avatar" aria-hidden="true">${escapeHtml((member.name || member.username || "?").charAt(0).toUpperCase())}</div>
                  <div>
                    <h3>${escapeHtml(member.name || "Unnamed")}</h3>
                    <p>@${escapeHtml(member.username || "—")}</p>
                    <div class="users-meta">
                      <span class="users-chip">${escapeHtml(roleLabel(member.role))}</span>
                      <span class="users-status ${disabled ? "is-off" : "is-on"}">${disabled ? "Disabled" : "Active"}</span>
                    </div>
                  </div>
                </div>
                <div class="users-card-actions">
                  <button
                    type="button"
                    class="btn-users btn-users-outline"
                    data-access-rights="${escapeHtml(member.id)}"
                  >
                    <i class="bi bi-shield-check"></i> Access rights
                  </button>
                  <button
                    type="button"
                    class="btn-users ${disabled ? "btn-users-primary" : "btn-users-danger"}"
                    data-toggle-status="${escapeHtml(member.id)}"
                    data-next-status="${disabled ? "active" : "disabled"}"
                  >
                    ${disabled ? "Enable access" : "Disable access"}
                  </button>
                </div>
              </article>
            `;
        })
        .join("");
}

async function refreshUsers() {
    if (!orgId) return;
    const loading = document.getElementById("usersLoading");
    if (loading) loading.hidden = false;
    try {
        members = await listOrgTeam(orgId);
        renderUsers();
    } catch (error) {
        console.error(error);
        showToast(
            error?.code === "permission-denied"
                ? "Firestore blocked loading users. Allow reads on organizations/{orgId}/org_members."
                : error?.message || "Could not load users."
        );
    } finally {
        if (loading) loading.hidden = true;
    }
}

function wireUi() {
    document.getElementById("openAddUserBtn")?.addEventListener("click", openAddModal);
    document.getElementById("emptyAddUserBtn")?.addEventListener("click", openAddModal);
    document.getElementById("closeAddUserBtn")?.addEventListener("click", closeAddModal);
    document.getElementById("cancelAddUserBtn")?.addEventListener("click", closeAddModal);
    document.getElementById("cancelAccessRightsBtn")?.addEventListener("click", closeAccessRightsModal);

    const addOverlay = document.getElementById("addUserModal");
    const accessOverlay = document.getElementById("accessRightsModal");

    addOverlay?.addEventListener("click", (event) => {
        if (event.target === addOverlay) closeAddModal();
    });
    accessOverlay?.addEventListener("click", (event) => {
        if (event.target === accessOverlay) closeAccessRightsModal();
    });

    document.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") return;
        if (accessOverlay?.classList.contains("is-open")) closeAccessRightsModal();
        else if (addOverlay?.classList.contains("is-open")) closeAddModal();
    });

    document.getElementById("accessModulesGrid")?.addEventListener("change", (event) => {
        if (event.target.matches("[data-access-module]")) {
            refreshAccessCounts();
        }
    });

    document.getElementById("saveAccessRightsBtn")?.addEventListener("click", async () => {
        if (!orgId || !accessMemberId) return;
        setAccessError("");
        const btn = document.getElementById("saveAccessRightsBtn");
        if (btn) btn.disabled = true;
        try {
            const rights = readAccessRightsFromForm();
            await updateOrgTeamAccessRights(orgId, accessMemberId, rights);
            // Drop any cached session for that member so their next load uses fresh rights.
            if (accessMemberId) clearOrgSessionCache(accessMemberId);
            closeAccessRightsModal();
            await refreshUsers();
            showToast("Access rights saved.");
        } catch (error) {
            console.error(error);
            setAccessError(
                error?.code === "permission-denied"
                    ? "Firestore blocked this save. Allow writes on organizations/{orgId}/org_members/{memberId}/access_rights."
                    : error?.message || "Could not save access rights."
            );
        } finally {
            if (btn) btn.disabled = false;
        }
    });

    document.getElementById("addUserForm")?.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!orgId) return;
        setFormError("");
        const submitBtn = document.getElementById("submitAddUserBtn");
        if (submitBtn) submitBtn.disabled = true;
        try {
            const role = document.getElementById("userRole")?.value || "staff";
            await createOrgTeamMember(orgId, {
                name: document.getElementById("userName")?.value,
                username: document.getElementById("userUsername")?.value,
                password: document.getElementById("userPassword")?.value,
                role,
                createdBy: orgId,
                accessRights: accessRightsForRole(role),
            });
            closeAddModal();
            await refreshUsers();
            showToast("User added. Set access rights anytime from their card.");
        } catch (error) {
            console.error(error);
            setFormError(
                error?.code === "permission-denied"
                    ? "Firestore blocked this save. Allow writes on organizations/{orgId}/org_members."
                    : error?.message || "Could not add user."
            );
        } finally {
            if (submitBtn) submitBtn.disabled = false;
        }
    });

    document.getElementById("usersList")?.addEventListener("click", async (event) => {
        const accessBtn = event.target.closest("[data-access-rights]");
        if (accessBtn) {
            const member = members.find((item) => item.id === accessBtn.dataset.accessRights);
            if (member) openAccessRightsModal(member);
            return;
        }

        const button = event.target.closest("[data-toggle-status]");
        if (!button || !orgId) return;
        const memberId = button.dataset.toggleStatus;
        const nextStatus = button.dataset.nextStatus;
        const member = members.find((item) => item.id === memberId);
        if (!member) return;

        const action = nextStatus === "disabled" ? "disable" : "enable";
        if (
            !window.confirm(
                `${action === "disable" ? "Disable" : "Enable"} access for ${member.name || member.username}?`
            )
        ) {
            return;
        }

        button.disabled = true;
        try {
            await setOrgTeamMemberStatus(orgId, memberId, nextStatus);
            await refreshUsers();
            showToast(
                nextStatus === "disabled"
                    ? "Access disabled for that user."
                    : "Access enabled for that user."
            );
        } catch (error) {
            console.error(error);
            showToast(error?.message || "Could not update access.");
            button.disabled = false;
        }
    });
}

function fillRoleOptions() {
    const select = document.getElementById("userRole");
    if (!select) return;
    select.innerHTML = TEAM_ROLES.map(
        (role) => `<option value="${role.id}">${role.label}</option>`
    ).join("");
    select.value = "staff";
}

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "/organization/login";
        return;
    }
    if (!(await assertOrgVerified(user))) return;

    const ownOrg = await getDoc(doc(db, "organizations", user.uid));
    if (!ownOrg.exists()) {
        const membership = await findTeamMembership(user);
        if (membership?.orgId) {
            showToast("Only the organization owner can manage users.");
            window.location.href = "/organization/dashboard";
            return;
        }
        window.location.href = "/organization/login";
        return;
    }

    orgId = user.uid;
    fillRoleOptions();
    wireUi();
    await refreshUsers();
});
