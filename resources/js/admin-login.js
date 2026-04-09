import { auth } from "./firebase.js";
import { signInWithEmailAndPassword } from "firebase/auth";

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("adminLoginForm");
    const loadingSpinner = document.getElementById("loadingSpinner");
    const loginText = document.getElementById("loginText");
    const alertContainer = document.getElementById("alertContainer");

    if (!form) {
        console.error("[ERROR] Admin login form not found!");
        return;
    }

    // Show alert function
    function showAlert(message, type = 'danger') {
        alertContainer.innerHTML = `
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
    }

    // Set loading state
    function setLoading(loading) {
        if (loading) {
            loadingSpinner.classList.add('show');
            loginText.textContent = 'Logging in...';
            form.querySelector('button[type="submit"]').disabled = true;
        } else {
            loadingSpinner.classList.remove('show');
            loginText.textContent = 'Login to Admin Panel';
            form.querySelector('button[type="submit"]').disabled = false;
        }
    }

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = document.getElementById("adminEmail").value;
        const password = document.getElementById("adminPassword").value;

        // Basic validation
        if (!email || !password) {
            showAlert('Please fill in all fields.');
            return;
        }

        // Check if it's an admin email (you can customize this)
        if (!email.includes('@admin.kalinga.com') && !email.includes('admin@')) {
            showAlert('Access denied. Admin credentials required.', 'warning');
            return;
        }

        try {
            setLoading(true);
            
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            console.log("[SUCCESS] Admin logged in:", user.email);
            
            // Store admin session info
            localStorage.setItem('adminUser', JSON.stringify({
                email: user.email,
                uid: user.uid,
                loginTime: new Date().toISOString()
            }));
            
            showAlert('Login successful! Redirecting...', 'success');
            
            // Redirect to admin dashboard after short delay
            setTimeout(() => {
                window.location.href = "/admin/dashboard";
            }, 1500);
            
        } catch (error) {
            console.error("[ERROR] Admin login failed:", error.message);
            
            let errorMessage = "Login failed. Please try again.";
            
            switch (error.code) {
                case 'auth/user-not-found':
                    errorMessage = "Admin account not found.";
                    break;
                case 'auth/wrong-password':
                    errorMessage = "Incorrect password.";
                    break;
                case 'auth/invalid-email':
                    errorMessage = "Invalid email format.";
                    break;
                case 'auth/too-many-requests':
                    errorMessage = "Too many failed attempts. Please try again later.";
                    break;
                default:
                    errorMessage = error.message;
            }
            
            showAlert(errorMessage);
        } finally {
            setLoading(false);
        }
    });
});