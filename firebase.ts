
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAX0n6lF5mp5dOFNWQCkhBSw3R-qGp8rQc",
  authDomain: "myproject-10ea3.firebaseapp.com",
  projectId: "myproject-10ea3",
  storageBucket: "myproject-10ea3.firebasestorage.app",
  messagingSenderId: "337767541289",
  appId: "1:337767541289:web:efc768923299d863c30a38",
  measurementId: "G-PFPFF3T1MK"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Analytics is optional and might fail in some environments
let analytics = null;
try {
  analytics = getAnalytics(app);
} catch (e) {
  console.warn("Analytics failed to initialize:", e);
}

export { app, auth, db, analytics };
