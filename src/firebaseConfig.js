// firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";   // 🔥 Firestore
import { getAuth } from "firebase/auth";  
        // 🔑 Authentication


const firebaseConfig = {
  apiKey: "AIzaSyDcfEA6zf8jjVWsz4zMfCDwiVSqA-01Vho",
  authDomain: "gration-bbc29.firebaseapp.com",
  projectId: "gration-bbc29",
  storageBucket: "gration-bbc29.firebasestorage.app",
  messagingSenderId: "910561130991",
  appId: "1:910561130991:web:682b90bfb387428ffc5e1a",
  measurementId: "G-RNWRJ2Q5BP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize services
const db = getFirestore(app);   // Firestore DB
const auth = getAuth(app);      // Firebase Auth


// Admin emails (you can also store this in Firestore)
export const ADMIN_EMAILS = [
  'contact@australiaimmigration.site',
  'your-email@gmail.com',
  // Add more admin emails as needed
];



// Export everything you need
export { app, analytics, db, auth };