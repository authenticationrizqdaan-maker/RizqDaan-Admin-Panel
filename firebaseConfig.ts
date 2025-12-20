
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, initializeFirestore } from "firebase/firestore";

// ==================================================================
// CONFIGURATION LOADED
// Keys have been applied from your Firebase Console screenshot.
// ==================================================================

const firebaseConfig = {
  apiKey: "AIzaSyAfv3SjVOWJCbS-RB_cuHKSrQ0uv4kJ__s",
  authDomain: "rizqdaan.firebaseapp.com",
  projectId: "rizqdaan",
  storageBucket: "rizqdaan.firebasestorage.app",
  messagingSenderId: "6770003964",
  appId: "1:6770003964:web:3e47e1d4e4ba724c446c79"
};

// Initialize Firebase
let app;
let auth: any = null;
let db: any = null;
const googleProvider = new GoogleAuthProvider();

// Helper to check if config is valid
export const isFirebaseConfigured = () => {
  return firebaseConfig.apiKey && firebaseConfig.apiKey !== "PASTE_YOUR_API_KEY_HERE";
};

try {
    if (isFirebaseConfigured()) {
        
        // 1. Robust App Initialization
        if (!getApps().length) {
            app = initializeApp(firebaseConfig);
        } else {
            app = getApp();
        }

        auth = getAuth(app);
        
        // 2. Enhanced Firestore Initialization
        // Use auto-detect for long polling to fix "Could not reach backend" errors
        try {
            db = initializeFirestore(app, {
                experimentalAutoDetectLongPolling: true,
            });
            console.log("Firestore initialized with Auto-Long Polling.");
        } catch (e: any) {
            db = getFirestore(app);
            console.log("Firestore using existing instance.");
        }
        
        console.log("Firebase connected successfully to project:", firebaseConfig.projectId);
    } else {
        console.warn("Firebase keys are missing. Using mock mode.");
    }
} catch (error: any) {
    const errorMessage = error?.message || String(error);
    console.error("Firebase initialization error: " + errorMessage);
}

export { auth, db, googleProvider };
