// firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";   // 🔥 Firestore
import { getAuth } from "firebase/auth";  
        // 🔑 Authentication



const firebaseConfig = {
  apiKey: "AIzaSyA5c9K3ir1r-p6YvU41Jf5z967BepD9x2c",
  authDomain: "migration-e6339.firebaseapp.com",
  projectId: "migration-e6339",
  storageBucket: "migration-e6339.appspot.com",   // ✅ fixed
  messagingSenderId: "527834525197",
  appId: "1:527834525197:web:d6396d402aa0dd1d5d2f44",
  measurementId: "G-DR406HPYGV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize services
const db = getFirestore(app);   // Firestore DB
const auth = getAuth(app);      // Firebase Auth

// Export everything you need
export { app, analytics, db, auth };
