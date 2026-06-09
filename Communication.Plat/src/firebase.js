import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Using the dedicated 'commplat-app-akhil' backend
const firebaseConfig = {
  apiKey: "AIzaSyCMLxLMWSn8grj9ZcS09nV0uIZNMcszoh8",
  authDomain: "commplat-app-akhil.firebaseapp.com",
  projectId: "commplat-app-akhil",
  storageBucket: "commplat-app-akhil.firebasestorage.app",
  messagingSenderId: "848176228274",
  appId: "1:848176228274:web:424248c48d054ce30ea6ab"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
