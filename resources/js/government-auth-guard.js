import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "/government/login";
    return;
  }

  try {
    const snap = await getDoc(doc(db, "government_offices", user.uid));
    const data = snap.exists() ? snap.data() : null;
    if (!data || (data.role && data.role !== "government")) {
      await signOut(auth);
      window.location.href = "/government/login";
    }
  } catch (error) {
    console.error("[ERROR] Government auth guard:", error);
    window.location.href = "/government/login";
  }
});
