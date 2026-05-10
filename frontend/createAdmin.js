import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAAmDj5e-GMunO16JPi_3hNFO0eU45J55Y",
  authDomain: "broadcasthub-v1-akhil.firebaseapp.com",
  projectId: "broadcasthub-v1-akhil",
  storageBucket: "broadcasthub-v1-akhil.firebasestorage.app",
  messagingSenderId: "439985722984",
  appId: "1:439985722984:web:bb2861ddc31ca76c954ddd"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function createAdmin() {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, 'admin@broadcast.com', 'admin123');
    const firebaseUser = userCredential.user;
    
    // Create user profile in Firestore
    await setDoc(doc(db, 'users', firebaseUser.uid), {
      name: 'Admin',
      email: 'admin@broadcast.com',
      role: 'admin',
      created_at: new Date().toISOString()
    });
    
    console.log("Admin created successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error creating admin:", error.message);
    process.exit(1);
  }
}

createAdmin();
