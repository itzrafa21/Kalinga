import { signOut } from "firebase/auth";
import { auth } from "./firebase"; // adjust path if needed

document.getElementById("logoutBtn").addEventListener("click", async () => {
    try {
        await signOut(auth);
        alert("Logged out successfully!");
        window.location.href = "/organization/login";
    } catch (error) {
        alert("Error logging out: " + error.message);
    }
});
