// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps, FirebaseOptions, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";

// TODO: Replace with your actual Firebase project configuration.
// CRITICAL: Ensure this configuration points to your VALID Firebase project
// and that Firestore has been enabled for this project in the Firebase console.
// An incorrect projectId or Firestore not being set up for the project
// is a common cause for "Service firestore is not available".
const firebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyAkDprDP8Z5lsEJi-FFeUycgHMwO61mntg",
  authDomain: "ces2026-87861.firebaseapp.com",
  projectId: "ces2026-87861",
  storageBucket: "ces2026-87861.firebasestorage.app",
  messagingSenderId: "927583999358",
  appId: "1:927583999358:web:844940e2f8d67b94f04f2f",
  measurementId: "G-6KETBQ73PN"
};

let app: FirebaseApp;
let db: Firestore;

try {
  // Simplify initialization: In most client-side apps, direct initialization is sufficient.
  // The getApps().length check is more common in environments with potential re-initialization.
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp(); // Get existing app if already initialized
  }

  db = getFirestore(app);
  console.log("Firebase app and Firestore service initialized successfully.");

} catch (e) {
  console.error(
    "CRITICAL FIREBASE INITIALIZATION ERROR: Failed to initialize Firebase app or Firestore service.",
    e
  );
  console.error(
    "IMPORTANT: Please ensure that the `firebaseConfig` object in `firebaseConfig.ts` contains the correct details " +
    "for your Firebase project and that you have ENABLED Firestore for this project in the Firebase console " +
    "(Project Settings -> Build -> Firestore Database -> Create database)."
  );
  // Re-throw the error to halt further execution if Firebase is essential.
  // This will make the issue apparent in the browser console.
  throw e;
}

export { db };
