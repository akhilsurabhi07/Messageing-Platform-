import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyAAmDj5e-GMunO16JPi_3hNFO0eU45J55Y",
  authDomain: "broadcasthub-v1-akhil.firebaseapp.com",
  projectId: "broadcasthub-v1-akhil",
  storageBucket: "broadcasthub-v1-akhil.firebasestorage.app",
  messagingSenderId: "439985722984",
  appId: "1:439985722984:web:bb2861ddc31ca76c954ddd"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
