import React, { createContext, useContext, useEffect, useState } from 'react';
import { db, auth } from '../firebase';
import { collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot, query, where, getDocs, arrayUnion, arrayRemove } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail } from 'firebase/auth';

const AuthContext = createContext();
export function useAuth() { return useContext(AuthContext); }

// No hardcoded seed data — all users come from real Firestore sign-ups

export function AuthProvider({ children }) {
  // firebaseUser: the raw Firebase Auth user object (set instantly on auth change)
  // currentUser/userData: the enriched Firestore profile (set after DB query)
  const [firebaseUser, setFirebaseUser] = useState(undefined); // undefined = still loading
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [allGroups, setAllGroups] = useState([]);

  // Live-sync all real users and groups from Firestore
  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersList = [];
      snapshot.forEach(d => usersList.push(d.data()));
      setAllUsers(usersList);
    });

    const unsubGroups = onSnapshot(collection(db, 'groups'), (snapshot) => {
      const groupsList = [];
      snapshot.forEach(d => groupsList.push(d.data()));
      setAllGroups(groupsList);
    });

    return () => {
      unsubUsers();
      unsubGroups();
    };
  }, []);

  // Firebase Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // Set firebaseUser IMMEDIATELY — this unblocks the PrivateRoute
      setFirebaseUser(user ?? null);

      if (user) {
        // Fetch enriched Firestore profile in the background
        try {
          const q = query(collection(db, 'users'), where('email', '==', user.email));
          const snap = await getDocs(q);
          if (!snap.empty) {
            const data = snap.docs[0].data();
            setCurrentUser(data);
            setUserData(data);
          } else {
            // Fallback: user exists in Auth but not yet in Firestore
            const fallback = { uid: user.uid, email: user.email, name: user.email.split('@')[0], role: 'employee' };
            setCurrentUser(fallback);
            setUserData(fallback);
          }
        } catch (err) {
          console.error('Error fetching user profile:', err);
          const fallback = { uid: user.uid, email: user.email, name: user.email.split('@')[0], role: 'employee' };
          setCurrentUser(fallback);
          setUserData(fallback);
        }
      } else {
        setCurrentUser(null);
        setUserData(null);
      }
    });
    return unsubscribe;
  }, []);

  async function signup(email, password, name) {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    const newUser = {
      uid: user.uid, email, name,
      role: email === 'akhilsurabhi07@gmail.com' ? 'superadmin' : 'employee',
      profilePic: '', isOnline: true, disabled: false
    };
    await setDoc(doc(db, 'users', newUser.uid), newUser);
    
    setCurrentUser(newUser);
    setUserData(newUser);
    return newUser;
  }

  async function login(email, password) {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);

    // Check if account is disabled
    const q = query(collection(db, 'users'), where('email', '==', email));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const found = snap.docs[0].data();
      if (found.disabled) {
        await signOut(auth);
        throw new Error('Your account has been disabled by an admin.');
      }
      // Immediately set currentUser so the dashboard loads without waiting for onAuthStateChanged
      setCurrentUser(found);
      setUserData(found);
    }
    return userCredential.user;
  }

  async function logout() {
    setCurrentUser(null);
    setUserData(null);
    await signOut(auth);
  }

  async function resetPassword(email) {
    await sendPasswordResetEmail(auth, email);
  }

  // ── Profile update ── saves to Firestore and immediately refreshes context ──
  async function updateUserProfile(updates) {
    if (!currentUser?.uid) throw new Error('No user logged in');
    await updateDoc(doc(db, 'users', currentUser.uid), updates);
    // Reflect changes immediately in context so Header/Sidebar update live
    setCurrentUser(prev => ({ ...prev, ...updates }));
    setUserData(prev =>  ({ ...prev, ...updates }));
  }

  // ── Admin management functions ──
  async function promoteToAdmin(uid) {
    await updateDoc(doc(db, 'users', uid), { role: 'admin' });
  }
  async function demoteToEmployee(uid) {
    await updateDoc(doc(db, 'users', uid), { role: 'employee' });
  }
  async function removeUser(uid) {
    await updateDoc(doc(db, 'users', uid), { disabled: true });
  }
  async function reinstateUser(uid) {
    await updateDoc(doc(db, 'users', uid), { disabled: false });
  }

  // ── Group management functions ──
  async function createGroup(name, creatorName, extraMemberUids = []) {
    const id = crypto.randomUUID();
    // Merge creator + selected members, remove duplicates
    const allMembers = [...new Set([userData?.uid, ...extraMemberUids].filter(Boolean))];
    const newGroup = { id, name, members: allMembers, createdBy: creatorName, isGroup: true };
    await setDoc(doc(db, 'groups', id), newGroup);
  }
  async function deleteGroup(groupId) {
    await deleteDoc(doc(db, 'groups', groupId));
  }
  async function addMemberToGroup(groupId, uid) {
    // Use arrayUnion — atomic, never overwrites other concurrent additions
    await updateDoc(doc(db, 'groups', groupId), { members: arrayUnion(uid) });
  }
  async function removeMemberFromGroup(groupId, uid) {
    // Use arrayRemove — atomic, safe for concurrent operations
    await updateDoc(doc(db, 'groups', groupId), { members: arrayRemove(uid) });
  }

  const value = {
    firebaseUser,
    currentUser, userData, allUsers, allGroups,
    signup, login, logout, resetPassword,
    updateUserProfile,
    promoteToAdmin, demoteToEmployee, removeUser, reinstateUser,
    createGroup, deleteGroup, addMemberToGroup, removeMemberFromGroup,
    isSuperAdmin: userData?.role === 'superadmin',
    isAdmin: userData?.role === 'admin' || userData?.role === 'superadmin',
  };

  // Show spinner only during the INITIAL auth check (firebaseUser === undefined)
  if (firebaseUser === undefined) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', backgroundColor: '#0a0a0f'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px', height: '48px', border: '4px solid #333',
            borderTop: '4px solid #c9a84c', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite', margin: '0 auto 16px'
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ color: '#888', margin: 0 }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
