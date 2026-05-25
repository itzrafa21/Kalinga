import { app } from "./firebase";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { assertOrgVerified } from "./org-verification.js";

const auth = getAuth(app);

document.addEventListener("DOMContentLoaded", () => {
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = "/organization/login";
            return;
        }

        await assertOrgVerified(user);
    });
});
