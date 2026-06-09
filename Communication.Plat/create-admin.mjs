import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, updatePassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCMLxLMWSn8grj9ZcS09nV0uIZNMcszoh8",
  authDomain: "commplat-app-akhil.firebaseapp.com",
  projectId: "commplat-app-akhil",
  storageBucket: "commplat-app-akhil.firebasestorage.app",
  messagingSenderId: "848176228274",
  appId: "1:848176228274:web:424248c48d054ce30ea6ab"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const ADMIN_EMAIL = 'akhilsurabhi07@gmail.com';
const ADMIN_PASSWORD = 'akhil123';
const ADMIN_NAME = 'Akhil Surabhi';

async function setupAdmin() {
  console.log('🔧 Setting up admin account...\n');

  // Step 1: Check if user already exists in Firestore
  const q = query(collection(db, 'users'), where('email', '==', ADMIN_EMAIL));
  const snap = await getDocs(q);

  if (!snap.empty) {
    // User exists — just update their role to superadmin
    const existingUser = snap.docs[0].data();
    console.log(`✅ User found: ${existingUser.name} (${existingUser.email})`);
    console.log(`   Current role: ${existingUser.role}`);

    if (existingUser.role !== 'superadmin') {
      await updateDoc(doc(db, 'users', existingUser.uid), { role: 'superadmin', disabled: false });
      console.log('✅ Role updated to superadmin!');
    } else {
      console.log('✅ Already a superadmin!');
    }
    console.log('\n🎉 Done! Login with:');
    console.log(`   Email   : ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
    process.exit(0);
  }

  // Step 2: Try to create new Firebase Auth account
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
    const user = userCredential.user;

    const newUser = {
      uid: user.uid,
      email: ADMIN_EMAIL,
      name: ADMIN_NAME,
      role: 'superadmin',
      profilePic: '',
      isOnline: false,
      disabled: false
    };

    await setDoc(doc(db, 'users', user.uid), newUser);
    console.log('✅ Admin account created successfully!');
    console.log('\n🎉 Done! Login with:');
    console.log(`   Email   : ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);

  } catch (err) {
    if (err.code === 'auth/email-already-in-use') {
      // Account exists in Auth but not Firestore — sign in and fix it
      console.log('⚠️  Account exists in Firebase Auth. Signing in to fix Firestore record...');
      try {
        const userCredential = await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
        const user = userCredential.user;
        const newUser = {
          uid: user.uid,
          email: ADMIN_EMAIL,
          name: ADMIN_NAME,
          role: 'superadmin',
          profilePic: '',
          isOnline: false,
          disabled: false
        };
        await setDoc(doc(db, 'users', user.uid), newUser);
        console.log('✅ Firestore record created with superadmin role!');
        console.log('\n🎉 Done! Login with:');
        console.log(`   Email   : ${ADMIN_EMAIL}`);
        console.log(`   Password: ${ADMIN_PASSWORD}`);
      } catch (loginErr) {
        console.error('❌ Could not sign in. Password might be different.');
        console.error('   Go to: https://commplat-app-akhil.web.app/login');
        console.error('   Use "Forgot Password" to reset, then re-run this script.');
      }
    } else {
      console.error('❌ Error:', err.message);
    }
  }
  process.exit(0);
}

setupAdmin();
