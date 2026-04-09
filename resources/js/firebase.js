import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAYmoSWpGTs3kDPlL_UTWjPx5rWR3mgXIM",
  authDomain: "kalinga-74544.firebaseapp.com",
  projectId: "kalinga-74544",
  storageBucket: "kalinga-74544.appspot.com",
  messagingSenderId: "731579975165",
  appId: "1:731579975165:web:67272a5ee2ccfc57b58594",
  measurementId: "G-XBLXFLQY9Z"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

//  Export app for auth-guard.js
export { app };
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);