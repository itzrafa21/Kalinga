import { app } from "./firebase";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { assertOrgVerified } from "./org-verification.js";
import {
    clearOrgSessionCache,
    requireOrgPageAccess,
    revealOrgPageContent,
    writeCachedOrgSession,
} from "./org-session.js";

const auth = getAuth(app);

document.addEventListener("DOMContentLoaded", () => {
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            clearOrgSessionCache();
            window.location.href = "/organization/login";
            return;
        }

        if (!(await assertOrgVerified(user))) return;

        const access = await requireOrgPageAccess(user);
        // null = login redirect or Access Denied already shown
        if (!access) return;

        writeCachedOrgSession(access.session);
        revealOrgPageContent();
    });
});
