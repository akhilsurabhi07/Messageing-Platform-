import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import Header from './Header';

import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { db } from '../../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

export default function AppLayout() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const location = useLocation();
  const { userData } = useAuth();
  const { sendNotification } = useSettings();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Global notification listener
  useEffect(() => {
    if (!userData?.uid) return;
    const now = new Date();
    const q = query(collection(db, `users/${userData.uid}/notifications`), where('read', '==', false));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          const createdDate = data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt)) : new Date();
          // Only notify for new events
          if (createdDate >= now) {
            sendNotification(data.title || 'New Notification', data.body || '');
          }
        }
      });
    });
    return () => unsubscribe();
  }, [userData?.uid, sendNotification]);

  return (
    <div style={styles.container}>
      {/* Desktop Sidebar */}
      {!isMobile && (
        <div style={styles.sidebarContainer}>
          <Sidebar />
        </div>
      )}

      {/* Main Content Area */}
      <div style={styles.mainContent}>
        <Header />
        <div style={styles.pageContent}>
          <Outlet />
        </div>
        
        {/* Mobile Bottom Navigation */}
        {isMobile && <MobileNav />}
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    height: '100vh',
    width: '100vw',
    backgroundColor: 'var(--bg-color)'
  },
  sidebarContainer: {
    width: '300px',
    borderRight: '1px solid var(--border-color)',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'var(--nav-bg)'
  },
  mainContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    position: 'relative'
  },
  pageContent: {
    flex: 1,
    overflowY: 'auto',
    backgroundColor: 'var(--bg-color)'
  }
};
