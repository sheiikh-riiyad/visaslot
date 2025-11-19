// firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth,  } from "firebase/auth";

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
const db = getFirestore(app);
const auth = getAuth(app);

export const ADMIN_EMAILS = [
  'contact@australiaimmigration.site',
  'your-email@gmail.com',
];

export { app, analytics, db, auth };