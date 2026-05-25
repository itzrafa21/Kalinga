import { auth, db } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

function setOrgWelcomeName(displayName) {
    const welcomeNameEl = document.getElementById("orgNameWelcome");
    if (welcomeNameEl) welcomeNameEl.textContent = displayName;
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

        if (snap.exists()) {
            const orgData = snap.data();
            displayName =
                (orgData.name && String(orgData.name).trim()) ||
                (orgData.orgName && String(orgData.orgName).trim()) ||
                user.displayName ||
                user.email;
        } else {
            displayName = user.displayName || user.email;
        }

        setOrgWelcomeName(displayName);
    } catch (err) {
        console.warn("[WARN] sidebar user:", err);
        setOrgWelcomeName(user.displayName || user.email);
    }
});
