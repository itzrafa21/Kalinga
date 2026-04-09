import { app } from './firebase';
import { getAuth, onAuthStateChanged } from "firebase/auth";

const auth = getAuth(app);

document.addEventListener("DOMContentLoaded", () => {
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            //  No user logged in → send back to login page
            window.location.href = "/organization/login";
        } else {
            //  Check if user is admin - if so, redirect to admin dashboard
            if (user.email.includes('@admin.kalinga.com') || user.email.includes('admin@')) {
                console.log("[WARNING] Admin user detected on organization page, redirecting to admin dashboard");
                window.location.href = "/admin/dashboard";
                return;
            }
            
            console.log("[SUCCESS] Organization user logged in:", user.email);
        }
    });
});
