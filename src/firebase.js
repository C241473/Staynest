import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyC_UGue9iHWEP2wNNctWT7hEo-DCo6j218",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "steynest-auth.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "steynest-auth",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "steynest-auth.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "128358293552",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:128358293552:web:66cdec44736e7454a60df5",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-4JLJR58GLQ",
};

const requiredFirebaseConfig = [
  firebaseConfig.apiKey,
  firebaseConfig.authDomain,
  firebaseConfig.projectId,
  firebaseConfig.storageBucket,
  firebaseConfig.messagingSenderId,
  firebaseConfig.appId,
];

export const firebaseReady = requiredFirebaseConfig.every(Boolean);

let app = null;
let auth = null;
let db = null;

try {
  if (firebaseReady) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  }
} catch (err) {
  console.warn("Firebase initialization failed:", err.message);
}

export { auth, db };
