import { getApps, initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDWw_zpLQAh7Wx2YwjNXToziQ6eD3TLCvs",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "caisse-familiale-47a52.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "caisse-familiale-47a52",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "caisse-familiale-47a52.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "655979703785",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:655979703785:web:10bb7502f873ab07606f78",
};

export const app = getApps()[0] ?? initializeApp(firebaseConfig);
export { firebaseConfig };
